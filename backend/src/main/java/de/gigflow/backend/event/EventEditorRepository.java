package de.gigflow.backend.event;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventEditorRepository extends JpaRepository<EventEditor, Long> {

    List<EventEditor> findByEventId(Long eventId);

    boolean existsByEventIdAndUserId(Long eventId, Long userId);

    void deleteByEventId(Long eventId);

    void deleteByEventIdAndUserId(Long eventId, Long userId);
}
