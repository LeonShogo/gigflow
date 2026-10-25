package de.gigflow.backend.setlist;

import de.gigflow.backend.event.EventOwnershipService;
import de.gigflow.backend.user.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/api/setlists")
public class SetlistController {

    private final SetlistService setlistService;
    private final EventOwnershipService ownershipService;

    public SetlistController(SetlistService setlistService, EventOwnershipService ownershipService) {
        this.setlistService = setlistService;
        this.ownershipService = ownershipService;
    }

    @GetMapping
    public List<SetlistResponse> getAllSetlists(
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        return setlistService.findAllSetlists().stream()
                .filter(setlist -> ownershipService.canViewEvent(currentUser, setlist.getEventId()))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SetlistResponse> getSetlistById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        Optional<SetlistResponse> setlist = setlistService.findSetlistById(id);
        if (setlist.isPresent()
                && !ownershipService.canViewEvent(currentUser, setlist.get().getEventId())) {
            return ResponseEntity.notFound().build();
        }
        return setlist.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<SetlistResponse> getSetlistByEvent(
            @PathVariable Long eventId,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canViewEvent(currentUser, eventId)) {
            return ResponseEntity.notFound().build();
        }
        Optional<SetlistResponse> setlist = setlistService.findSetlistByEvent(eventId);
        return setlist.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<SetlistResponse> createSetlist(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody SetlistRequest request) {
        if (!ownershipService.canEditEvent(currentUser, request.getEventId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            SetlistResponse created = setlistService.createSetlist(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<SetlistResponse> updateSetlist(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody SetlistRequest request) {
        if (!ownershipService.canManageSetlist(currentUser, id)
                || !ownershipService.canEditEvent(currentUser, request.getEventId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            SetlistResponse updated = setlistService.updateSetlist(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSetlist(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canManageSetlist(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        setlistService.deleteSetlist(id);
        return ResponseEntity.noContent().build();
    }
}
