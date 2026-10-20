package de.gigflow.backend.user;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public SecurityConfig(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtService, userRepository);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        JwtAuthenticationFilter jwtAuthenticationFilter = jwtAuthenticationFilter();
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Authentication endpoints are public.
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // A logged-in musician may join an event and manage their own participation.
                        .requestMatchers(HttpMethod.POST, "/api/events/*/join").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/event-participations/*").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/event-participations/*").authenticated()
                        // All other write operations are reserved for organizers.
                        .requestMatchers(HttpMethod.POST, "/api/**").hasRole("ORGANIZER")
                        .requestMatchers(HttpMethod.PUT, "/api/**").hasRole("ORGANIZER")
                        .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ORGANIZER")
                        // Reads are available to any authenticated account.
                        .requestMatchers("/api/**").authenticated()
                        // Angular routes and static PWA assets are public; the client guards protected views.
                        .anyRequest().permitAll())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
