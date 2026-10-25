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
@RequestMapping("/api/event-participations")
public class EventParticipationController {

    private final EventParticipationService participationService;
    private final EventOwnershipService ownershipService;

    public EventParticipationController(
            EventParticipationService participationService,
            EventOwnershipService ownershipService) {
        this.participationService = participationService;
        this.ownershipService = ownershipService;
    }

    @GetMapping
    public List<EventParticipationResponseDto> getAllParticipations(
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        return participationService.findAllParticipations().stream()
                .filter(participation -> ownershipService.canViewEvent(currentUser, participation.getEventId()))
                .toList();
    }

    @GetMapping("/event/{eventId}")
    public List<EventParticipationResponseDto> getParticipationsByEvent(
            @PathVariable Long eventId,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canViewEvent(currentUser, eventId)) {
            return List.of();
        }
        return participationService.findParticipationsByEvent(eventId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventParticipationResponseDto> getParticipationById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        Optional<EventParticipationResponseDto> participation = participationService.findParticipationById(id);
        if (participation.isPresent()
                && !ownershipService.canViewEvent(currentUser, participation.get().getEventId())) {
            return ResponseEntity.notFound().build();
        }
        return participation.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EventParticipationResponseDto> createParticipation(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody EventParticipationRequestDto request) {
        if (!ownershipService.ownsEvent(currentUser, request.getEventId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            EventParticipationResponseDto created = participationService.createParticipation(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventParticipationResponseDto> updateParticipation(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody EventParticipationRequestDto request) {
        var existing = participationService.findParticipationById(id);
        boolean ownParticipation = existing.isPresent()
                && currentUser != null
                && currentUser.musicianId() != null
                && currentUser.musicianId().equals(existing.get().getMusicianId())
                && existing.get().getEventId().equals(request.getEventId())
                && existing.get().getMusicianId().equals(request.getMusicianId());
        if (!ownershipService.canManageParticipation(currentUser, id) || (!ownParticipation
                && !ownershipService.ownsEvent(currentUser, request.getEventId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            EventParticipationResponseDto updated = participationService.updateParticipation(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteParticipation(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canManageParticipation(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        participationService.deleteParticipation(id);
        return ResponseEntity.noContent().build();
    }

}
