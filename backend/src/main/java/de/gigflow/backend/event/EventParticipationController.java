package de.gigflow.backend.event;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    public EventParticipationController(EventParticipationService participationService) {
        this.participationService = participationService;
    }

    @GetMapping
    public List<EventParticipationResponseDto> getAllParticipations() {
        return participationService.findAllParticipations();
    }

    @GetMapping("/event/{eventId}")
    public List<EventParticipationResponseDto> getParticipationsByEvent(@PathVariable Long eventId) {
        return participationService.findParticipationsByEvent(eventId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventParticipationResponseDto> getParticipationById(@PathVariable Long id) {
        Optional<EventParticipationResponseDto> participation = participationService.findParticipationById(id);
        return participation.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EventParticipationResponseDto> createParticipation(@Valid @RequestBody EventParticipationRequestDto request) {
        try {
            EventParticipationResponseDto created = participationService.createParticipation(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventParticipationResponseDto> updateParticipation(@PathVariable Long id, @Valid @RequestBody EventParticipationRequestDto request) {
        try {
            EventParticipationResponseDto updated = participationService.updateParticipation(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteParticipation(@PathVariable Long id) {
        participationService.deleteParticipation(id);
        return ResponseEntity.noContent().build();
    }
}
