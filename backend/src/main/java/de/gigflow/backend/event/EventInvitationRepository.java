package de.gigflow.backend.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventInvitationRepository extends JpaRepository<EventInvitation, Long> {

    Optional<EventInvitation> findByTokenHash(String tokenHash);

    List<EventInvitation> findByEventIdAndStatus(Long eventId, EventInvitationStatus status);

    void deleteByEventId(Long eventId);
}
