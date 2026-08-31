package de.gigflow.backend.user;

import de.gigflow.backend.musician.Musician;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(String email, String passwordHash) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordHash);
        return userRepository.save(user);
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
