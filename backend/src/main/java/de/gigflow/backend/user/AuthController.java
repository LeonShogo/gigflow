package de.gigflow.backend.user;

import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.musician.MusicianService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final MusicianService musicianService;
    private final JwtService jwtService;

    public AuthController(UserService userService, MusicianService musicianService, JwtService jwtService) {
        this.userService = userService;
        this.musicianService = musicianService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            User user = userService.register(request.getEmail(), request.getPassword());
            Musician musician = musicianService.createMusicianEntity(
                    request.getFirstName(), request.getLastName(), request.getInstrument());
            userService.linkToMusician(user, musician);
            String token = jwtService.generateToken(user.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(AuthResponse.of(token, user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorMessage(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Optional<User> user = userService.authenticate(request.getEmail(), request.getPassword());
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorMessage("E-Mail oder Passwort ist falsch."));
        }
        String token = jwtService.generateToken(user.get().getId());
        return ResponseEntity.ok(AuthResponse.of(token, user.get()));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(Authentication authentication) {
        AuthenticatedUser principal = (AuthenticatedUser) authentication.getPrincipal();
        Optional<User> user = userService.findById(principal.userId());
        if (user.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(UserDto.from(user.get()));
    }

    public static class ErrorMessage {
        private String message;

        public ErrorMessage(String message) {
            this.message = message;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }
}
