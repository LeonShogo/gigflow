package de.gigflow.backend.equipment;

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
@RequestMapping("/api/equipment-requirements")
public class EquipmentRequirementController {

    private final EquipmentRequirementService requirementService;

    public EquipmentRequirementController(EquipmentRequirementService requirementService) {
        this.requirementService = requirementService;
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
    public ResponseEntity<EquipmentRequirementResponse> createRequirement(@Valid @RequestBody EquipmentRequirementRequest request) {
        try {
            EquipmentRequirementResponse created = requirementService.createRequirement(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<EquipmentRequirementResponse> updateRequirement(@PathVariable Long id, @Valid @RequestBody EquipmentRequirementRequest request) {
        try {
            EquipmentRequirementResponse updated = requirementService.updateRequirement(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRequirement(@PathVariable Long id) {
        requirementService.deleteRequirement(id);
        return ResponseEntity.noContent().build();
    }
}
