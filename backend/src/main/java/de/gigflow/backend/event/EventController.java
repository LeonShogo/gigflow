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

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;
    private final EventParticipationService participationService;
    private final EventOwnershipService ownershipService;
    private final EventAccessService accessService;

    public EventController(
            EventService eventService,
            EventParticipationService participationService,
            EventOwnershipService ownershipService,
            EventAccessService accessService) {
        this.eventService = eventService;
        this.participationService = participationService;
        this.ownershipService = ownershipService;
        this.accessService = accessService;
    }

    @GetMapping
    public List<EventResponse> getAllEvents(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (currentUser == null) {
            return List.of();
        }
        return eventService.findEventsVisibleToUser(currentUser.userId(), currentUser.musicianId()).stream()
                .peek(event -> event.setCanEdit(ownershipService.canEditEvent(currentUser, event.getId())))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canViewEvent(currentUser, id)) {
            return ResponseEntity.notFound().build();
        }
        Optional<EventResponse> event = eventService.findEventById(id);
        return event.map(item -> {
                    item.setCanEdit(ownershipService.canEditEvent(currentUser, id));
                    return ResponseEntity.ok(item);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/by-concert/{concertId}")
    public List<EventResponse> getRehearsalsByConcert(
            @PathVariable Long concertId,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canViewEvent(currentUser, concertId)) {
            return List.of();
        }
        return eventService.findRehearsalsByConcert(concertId).stream()
                .peek(event -> event.setCanEdit(ownershipService.canEditEvent(currentUser, event.getId())))
                .toList();
    }

    @GetMapping("/{id}/layout")
    public ResponseEntity<PanelLayout> getPanelLayout(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canViewEvent(currentUser, id)) {
            return ResponseEntity.notFound().build();
        }
        return eventService.findPanelLayout(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/layout")
    public ResponseEntity<PanelLayout> updatePanelLayout(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestBody PanelLayout layout) {
        if (!ownershipService.canEditEvent(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return eventService.updatePanelLayout(id, layout)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Lets the logged-in musician register themselves for an event (status ACCEPTED).
     */
    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinEvent(@PathVariable Long id,
                                       @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (currentUser == null || currentUser.musicianId() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorBody("Kein Musiker-Konto verknüpft."));
        }
        if (!ownershipService.canViewEvent(currentUser, id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            EventParticipationResponseDto joined = participationService.joinSelf(id, currentUser.musicianId());
            return ResponseEntity.status(HttpStatus.CREATED).body(joined);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Invites all musicians of the selected band as INVITED participants.
     */
    @PostMapping("/{id}/invite-band/{bandId}")
    public ResponseEntity<List<EventParticipationResponseDto>> inviteBand(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable Long bandId) {
        if (!ownershipService.ownsEvent(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.ok(participationService.inviteBandMembers(id, bandId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createEvent(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody EventRequest request) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (request.getConcertId() != null && !ownershipService.canEditEvent(currentUser, request.getConcertId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (request.getEditPolicy() == EventEditPolicy.SELECTED_PARTICIPANTS) {
            try {
                accessService.validateEditorSelection(currentUser, request.getEditorUserIds());
            } catch (IllegalArgumentException exception) {
                return ResponseEntity.badRequest().body(new ErrorBody(exception.getMessage()));
            }
        }
        try {
            EventResponse created = eventService.createEvent(request, currentUser.userId());
            if (request.getEditPolicy() == EventEditPolicy.SELECTED_PARTICIPANTS) {
                EventAccessRequest accessRequest = new EventAccessRequest();
                accessRequest.setEditPolicy(request.getEditPolicy());
                accessRequest.setEditorUserIds(request.getEditorUserIds());
                accessService.configureEditing(created.getId(), currentUser, accessRequest);
            }
            created.setCanEdit(true);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventResponse> updateEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody EventRequest request) {
        if (!ownershipService.canEditEvent(currentUser, id)
                || (request.getConcertId() != null && !ownershipService.canEditEvent(currentUser, request.getConcertId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            EventResponse updated = eventService.updateEvent(id, request);
            updated.setCanEdit(true);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.ownsEvent(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            eventService.deleteEvent(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAllEvents(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        eventService.deleteAllEvents(currentUser.userId());
        return ResponseEntity.noContent().build();
    }

    public static class ErrorBody {
        private String message;

        public ErrorBody(String message) {
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
