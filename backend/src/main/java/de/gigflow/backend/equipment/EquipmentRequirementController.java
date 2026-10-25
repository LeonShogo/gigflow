package de.gigflow.backend.equipment;

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
@RequestMapping("/api/equipment-requirements")
public class EquipmentRequirementController {

    private final EquipmentRequirementService requirementService;
    private final EventOwnershipService ownershipService;

    public EquipmentRequirementController(
            EquipmentRequirementService requirementService,
            EventOwnershipService ownershipService) {
        this.requirementService = requirementService;
        this.ownershipService = ownershipService;
    }

    @GetMapping
    public List<EquipmentRequirementResponse> getAllRequirements() {
        return requirementService.findAllRequirements();
    }

    @GetMapping("/event/{eventId}")
    public List<EquipmentRequirementResponse> getRequirementsByEvent(@PathVariable Long eventId) {
        return requirementService.findRequirementsByEvent(eventId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EquipmentRequirementResponse> getRequirementById(@PathVariable Long id) {
        Optional<EquipmentRequirementResponse> requirement = requirementService.findRequirementById(id);
        return requirement.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EquipmentRequirementResponse> createRequirement(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody EquipmentRequirementRequest request) {
        if (!ownershipService.ownsEvent(currentUser, request.getEventId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            EquipmentRequirementResponse created = requirementService.createRequirement(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<EquipmentRequirementResponse> updateRequirement(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody EquipmentRequirementRequest request) {
        if (!ownershipService.canManageRequirement(currentUser, id)
                || !ownershipService.ownsEvent(currentUser, request.getEventId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            EquipmentRequirementResponse updated = requirementService.updateRequirement(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRequirement(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canManageRequirement(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        requirementService.deleteRequirement(id);
        return ResponseEntity.noContent().build();
    }
}
