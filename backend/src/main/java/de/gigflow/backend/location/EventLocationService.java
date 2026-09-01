package de.gigflow.backend.location;

import de.gigflow.backend.event.Event;
import de.gigflow.backend.event.EventRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EventLocationService {

    private final EventLocationRepository eventLocationRepository;
    private final EventRepository eventRepository;

    public EventLocationService(EventLocationRepository eventLocationRepository,
                                EventRepository eventRepository) {
        this.eventLocationRepository = eventLocationRepository;
        this.eventRepository = eventRepository;
    }

    public EventLocationResponse createEventLocation(EventLocationRequest request) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + request.getEventId()));
        EventLocation location = new EventLocation();
        location.setEvent(event);
        apply(location, request);
        return EventLocationResponse.from(eventLocationRepository.save(location));
    }

    public Optional<EventLocationResponse> findEventLocationById(Long id) {
        return eventLocationRepository.findById(id).map(EventLocationResponse::from);
    }

    public EventLocationResponse updateEventLocation(Long id, EventLocationRequest request) {
        EventLocation existing = eventLocationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ort nicht gefunden: " + id));
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + request.getEventId()));
        existing.setEvent(event);
        apply(existing, request);
        return EventLocationResponse.from(eventLocationRepository.save(existing));
    }

    public List<EventLocationResponse> findEventLocationsByEvent(Long eventId) {
        return eventLocationRepository.findByEventId(eventId).stream()
                .map(EventLocationResponse::from)
                .toList();
    }

    public void deleteEventLocation(Long id) {
        eventLocationRepository.deleteById(id);
    }

    private void apply(EventLocation location, EventLocationRequest request) {
        location.setType(request.getType());
        location.setName(request.getName());
        location.setAddress(request.getAddress());
        location.setNote(request.getNote());
        location.setPhone(request.getPhone());
        location.setMapsUrl(request.getMapsUrl());
    }
}