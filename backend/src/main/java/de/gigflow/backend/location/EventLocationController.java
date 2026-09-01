package de.gigflow.backend.location;

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
@RequestMapping("/api/event-locations")
public class EventLocationController {

    private final EventLocationService eventLocationService;

    public EventLocationController(EventLocationService eventLocationService) {
        this.eventLocationService = eventLocationService;
    }

    @GetMapping("/event/{eventId}")
    public List<EventLocationResponse> getEventLocationsByEvent(@PathVariable Long eventId) {
        return eventLocationService.findEventLocationsByEvent(eventId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventLocationResponse> getEventLocationById(@PathVariable Long id) {
        Optional<EventLocationResponse> location = eventLocationService.findEventLocationById(id);
        return location.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EventLocationResponse> createEventLocation(@Valid @RequestBody EventLocationRequest request) {
        try {
            EventLocationResponse created = eventLocationService.createEventLocation(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventLocationResponse> updateEventLocation(@PathVariable Long id, @Valid @RequestBody EventLocationRequest request) {
        try {
            EventLocationResponse updated = eventLocationService.updateEventLocation(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEventLocation(@PathVariable Long id) {
        eventLocationService.deleteEventLocation(id);
        return ResponseEntity.noContent().build();
    }
}