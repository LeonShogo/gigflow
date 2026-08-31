package de.gigflow.backend.schedule;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduleItemRepository extends JpaRepository<ScheduleItem, Long> {

    List<ScheduleItem> findByEventId(Long eventId);
}
