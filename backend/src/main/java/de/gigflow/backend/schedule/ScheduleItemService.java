package de.gigflow.backend.schedule;

import de.gigflow.backend.event.Event;
import de.gigflow.backend.event.EventRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class ScheduleItemService {

    private final ScheduleItemRepository scheduleItemRepository;
    private final EventRepository eventRepository;

    public ScheduleItemService(ScheduleItemRepository scheduleItemRepository,
                               EventRepository eventRepository) {
        this.scheduleItemRepository = scheduleItemRepository;
        this.eventRepository = eventRepository;
    }

    public ScheduleItemResponse createScheduleItem(ScheduleItemRequest request) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + request.getEventId()));
        ScheduleItem item = new ScheduleItem();
        item.setEvent(event);
        item.setLabel(request.getLabel());
        item.setTime(request.getTime());
        return ScheduleItemResponse.from(scheduleItemRepository.save(item));
    }

    public Optional<ScheduleItemResponse> findScheduleItemById(Long id) {
        return scheduleItemRepository.findById(id).map(ScheduleItemResponse::from);
    }

    public ScheduleItemResponse updateScheduleItem(Long id, ScheduleItemRequest request) {
        ScheduleItem existing = scheduleItemRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ablaufpunkt nicht gefunden: " + id));
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + request.getEventId()));
        existing.setEvent(event);
        existing.setLabel(request.getLabel());
        existing.setTime(request.getTime());
        return ScheduleItemResponse.from(scheduleItemRepository.save(existing));
    }

    public List<ScheduleItemResponse> findScheduleItemsByEvent(Long eventId) {
        return scheduleItemRepository.findByEventId(eventId).stream()
                .sorted(Comparator.comparing(ScheduleItem::getTime))
                .map(ScheduleItemResponse::from)
                .toList();
    }

    public void deleteScheduleItem(Long id) {
        scheduleItemRepository.deleteById(id);
    }
}
