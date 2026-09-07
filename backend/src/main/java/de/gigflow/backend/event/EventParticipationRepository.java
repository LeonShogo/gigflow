package de.gigflow.backend.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventParticipationRepository extends JpaRepository<EventParticipation, Long> {

    List<EventParticipation> findByEventId(Long eventId);

    List<EventParticipation> findByMusicianId(Long musicianId);

    boolean existsByEventIdAndMusicianId(Long eventId, Long musicianId);

    Optional<EventParticipation> findByEventIdAndMusicianId(Long eventId, Long musicianId);
}
