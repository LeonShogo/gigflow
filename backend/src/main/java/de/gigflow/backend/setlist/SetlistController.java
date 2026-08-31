package de.gigflow.backend.setlist;

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
@RequestMapping("/api/setlists")
public class SetlistController {

    private final SetlistService setlistService;

    public SetlistController(SetlistService setlistService) {
        this.setlistService = setlistService;
    }

    @GetMapping
    public List<SetlistResponse> getAllSetlists() {
        return setlistService.findAllSetlists();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SetlistResponse> getSetlistById(@PathVariable Long id) {
        Optional<SetlistResponse> setlist = setlistService.findSetlistById(id);
        return setlist.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<SetlistResponse> getSetlistByEvent(@PathVariable Long eventId) {
        Optional<SetlistResponse> setlist = setlistService.findSetlistByEvent(eventId);
        return setlist.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<SetlistResponse> createSetlist(@Valid @RequestBody SetlistRequest request) {
        try {
            SetlistResponse created = setlistService.createSetlist(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<SetlistResponse> updateSetlist(@PathVariable Long id, @Valid @RequestBody SetlistRequest request) {
        try {
            SetlistResponse updated = setlistService.updateSetlist(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSetlist(@PathVariable Long id) {
        setlistService.deleteSetlist(id);
        return ResponseEntity.noContent().build();
    }
}
