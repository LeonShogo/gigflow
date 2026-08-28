package de.gigflow.backend.band;

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
@RequestMapping("/api/memberships")
public class BandMembershipController {

    private final BandMembershipService membershipService;

    public BandMembershipController(BandMembershipService membershipService) {
        this.membershipService = membershipService;
    }

    @GetMapping
    public List<BandMembershipResponse> getAllMemberships() {
        return membershipService.findAllMemberships();
    }

    @GetMapping("/{id}")
    public ResponseEntity<BandMembershipResponse> getMembershipById(@PathVariable Long id) {
        Optional<BandMembershipResponse> membership = membershipService.findMembershipById(id);
        return membership.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<BandMembershipResponse> createMembership(@Valid @RequestBody BandMembershipRequest request) {
        try {
            BandMembershipResponse created = membershipService.createMembership(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<BandMembershipResponse> updateMembership(@PathVariable Long id, @Valid @RequestBody BandMembershipRequest request) {
        try {
            BandMembershipResponse updated = membershipService.updateMembership(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMembership(@PathVariable Long id) {
        membershipService.deleteMembership(id);
        return ResponseEntity.noContent().build();
    }
}
