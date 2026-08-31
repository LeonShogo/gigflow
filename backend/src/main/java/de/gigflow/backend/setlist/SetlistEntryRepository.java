package de.gigflow.backend.setlist;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SetlistEntryRepository extends JpaRepository<SetlistEntry, Long> {

    List<SetlistEntry> findBySetlistIdOrderByPositionAsc(Long setlistId);

    Optional<SetlistEntry> findFirstBySetlistIdOrderByPositionDesc(Long setlistId);
}
