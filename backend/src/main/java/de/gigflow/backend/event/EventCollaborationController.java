package de.gigflow.backend.event;

import de.gigflow.backend.user.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/events")
public class EventCollaborationController {

    private final EventAccessService accessService;
    private final EventOwnershipService ownershipService;

    public EventCollaborationController(
            EventAccessService accessService,
            EventOwnershipService ownershipService) {
        this.accessService = accessService;
        this.ownershipService = ownershipService;
    }

    @GetMapping("/{eventId}/access")
    public ResponseEntity<EventAccessResponse> getAccess(
            @PathVariable Long eventId,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.ownsEvent(currentUser, eventId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(accessService.getEditingConfig(eventId, currentUser));
    }

    @PutMapping("/{eventId}/access")
    public ResponseEntity<?> updateAccess(
            @PathVariable Long eventId,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody EventAccessRequest request) {
        if (!ownershipService.ownsEvent(currentUser, eventId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.ok(accessService.configureEditing(eventId, currentUser, request));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(new EventController.ErrorBody(exception.getMessage()));
        }
    }

    @PostMapping("/{eventId}/members")
    public ResponseEntity<?> addMembers(
            @PathVariable Long eventId,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody EventMembersRequest request) {
        if (!ownershipService.ownsEvent(currentUser, eventId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(accessService.addKnownMembers(eventId, currentUser, request.getUserIds()));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(new EventController.ErrorBody(exception.getMessage()));
        }
    }

    @PostMapping("/{eventId}/invitation-link")
    public ResponseEntity<?> createInvitationLink(
            @PathVariable Long eventId,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.ownsEvent(currentUser, eventId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(accessService.createInvitationLink(eventId, currentUser));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(new EventController.ErrorBody(exception.getMessage()));
        }
    }

    @DeleteMapping("/{eventId}/membership")
    public ResponseEntity<?> leaveEvent(
            @PathVariable Long eventId,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        try {
            accessService.leaveEvent(eventId, currentUser);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(new EventController.ErrorBody(exception.getMessage()));
        }
    }
}
