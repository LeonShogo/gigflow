package de.gigflow.backend.user;

import de.gigflow.backend.musician.Musician;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(String email, String rawPassword, boolean organizer) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Es existiert bereits ein Konto mit dieser E-Mail.");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setOrganizer(organizer);
        return userRepository.save(user);
    }

    public Optional<User> authenticate(String email, String rawPassword) {
        return userRepository.findByEmail(email)
                .filter(user -> passwordEncoder.matches(rawPassword, user.getPasswordHash()));
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public User linkToMusician(User user, Musician musician) {
        user.setMusician(musician);
        return userRepository.save(user);
    }
}
