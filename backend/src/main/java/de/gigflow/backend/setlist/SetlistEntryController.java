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
@RequestMapping("/api/setlist-entries")
public class SetlistEntryController {

    private final SetlistEntryService entryService;
    private final EventOwnershipService ownershipService;

    public SetlistEntryController(SetlistEntryService entryService, EventOwnershipService ownershipService) {
        this.entryService = entryService;
        this.ownershipService = ownershipService;
    }

    @GetMapping
    public List<SetlistEntryResponse> getAllEntries() {
        return entryService.findAllEntries();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SetlistEntryResponse> getEntryById(@PathVariable Long id) {
        Optional<SetlistEntryResponse> entry = entryService.findEntryById(id);
        return entry.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/by-setlist/{setlistId}")
    public List<SetlistEntryResponse> getEntriesBySetlist(@PathVariable Long setlistId) {
        return entryService.findEntriesBySetlist(setlistId);
    }

    @PostMapping
    public ResponseEntity<SetlistEntryResponse> createEntry(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody SetlistEntryRequest request) {
        if (!ownershipService.canManageSetlist(currentUser, request.getSetlistId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            SetlistEntryResponse created = entryService.createEntry(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<SetlistEntryResponse> updateEntry(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody SetlistEntryRequest request) {
        if (!ownershipService.canManageSetlistEntry(currentUser, id)
                || !ownershipService.canManageSetlist(currentUser, request.getSetlistId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            SetlistEntryResponse updated = entryService.updateEntry(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEntry(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canManageSetlistEntry(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        entryService.deleteEntry(id);
        return ResponseEntity.noContent().build();
    }
}
