package de.gigflow.backend.event;

import de.gigflow.backend.user.AuthenticatedUser;
import de.gigflow.backend.user.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/event-invitations")
public class EventInvitationController {

    private final EventAccessService accessService;
    private final UserService userService;

    public EventInvitationController(EventAccessService accessService, UserService userService) {
        this.accessService = accessService;
        this.userService = userService;
    }

    @PostMapping("/accept")
    public ResponseEntity<?> accept(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody EventInvitationAcceptRequest request) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return userService.findById(currentUser.userId())
                .map(user -> {
                    try {
                        return ResponseEntity.ok(accessService.acceptInvitation(
                                request.getToken(), currentUser, user.getEmail()));
                    } catch (IllegalArgumentException exception) {
                        return ResponseEntity.badRequest()
                                .body(new EventController.ErrorBody(exception.getMessage()));
                    }
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
