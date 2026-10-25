package de.gigflow.backend.user;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserContactController {

    private final UserContactService contactService;

    public UserContactController(UserContactService contactService) {
        this.contactService = contactService;
    }

    @GetMapping("/contacts")
    public List<UserContactResponse> getContacts(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return contactService.findContacts(currentUser);
    }
}
