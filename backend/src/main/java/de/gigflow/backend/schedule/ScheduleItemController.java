package de.gigflow.backend.schedule;

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
@RequestMapping("/api/schedule-items")
public class ScheduleItemController {

    private final ScheduleItemService scheduleItemService;
    private final EventOwnershipService ownershipService;

    public ScheduleItemController(ScheduleItemService scheduleItemService, EventOwnershipService ownershipService) {
        this.scheduleItemService = scheduleItemService;
        this.ownershipService = ownershipService;
    }

    @GetMapping("/event/{eventId}")
    public List<ScheduleItemResponse> getScheduleItemsByEvent(@PathVariable Long eventId) {
        return scheduleItemService.findScheduleItemsByEvent(eventId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScheduleItemResponse> getScheduleItemById(@PathVariable Long id) {
        Optional<ScheduleItemResponse> item = scheduleItemService.findScheduleItemById(id);
        return item.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ScheduleItemResponse> createScheduleItem(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody ScheduleItemRequest request) {
        if (!ownershipService.ownsEvent(currentUser, request.getEventId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            ScheduleItemResponse created = scheduleItemService.createScheduleItem(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ScheduleItemResponse> updateScheduleItem(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody ScheduleItemRequest request) {
        if (!ownershipService.canManageScheduleItem(currentUser, id)
                || !ownershipService.ownsEvent(currentUser, request.getEventId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            ScheduleItemResponse updated = scheduleItemService.updateScheduleItem(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteScheduleItem(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canManageScheduleItem(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        scheduleItemService.deleteScheduleItem(id);
        return ResponseEntity.noContent().build();
    }
}
