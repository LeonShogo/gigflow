package de.gigflow.backend.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findByConcertId(Long concertId);

    boolean existsByBandId(Long bandId);
}
