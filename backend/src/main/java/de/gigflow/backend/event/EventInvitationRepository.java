package de.gigflow.backend.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EventInvitationRepository extends JpaRepository<EventInvitation, Long> {

    Optional<EventInvitation> findByTokenHash(String tokenHash);

    Optional<EventInvitation> findByEventIdAndEmailAndStatus(Long eventId, String email, EventInvitationStatus status);

    void deleteByEventId(Long eventId);
}
