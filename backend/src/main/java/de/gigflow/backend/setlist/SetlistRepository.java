package de.gigflow.backend.setlist;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SetlistRepository extends JpaRepository<Setlist, Long> {

    Optional<Setlist> findByEventId(Long eventId);
}
