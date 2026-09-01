package de.gigflow.backend.location;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventLocationRepository extends JpaRepository<EventLocation, Long> {

    List<EventLocation> findByEventId(Long eventId);
}