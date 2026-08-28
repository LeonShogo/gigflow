package de.gigflow.backend.event;

import de.gigflow.backend.band.Band;
import de.gigflow.backend.band.BandRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final BandRepository bandRepository;

    public EventService(EventRepository eventRepository, BandRepository bandRepository) {
        this.eventRepository = eventRepository;
        this.bandRepository = bandRepository;
    }

    public EventResponse createEvent(EventRequest request) {
        Band band = bandRepository.findById(request.getBandId())
                .orElseThrow(() -> new IllegalArgumentException("Band nicht gefunden: " + request.getBandId()));
        Event event = new Event();
        event.setTitle(request.getTitle());
        event.setDateTime(request.getDateTime());
        event.setType(request.getType());
        event.setBand(band);
        return EventResponse.from(eventRepository.save(event));
    }

    public Optional<EventResponse> findEventById(Long id) {
        return eventRepository.findById(id).map(EventResponse::from);
    }

    public EventResponse updateEvent(Long id, EventRequest request) {
        Event existing = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + id));
        Band band = bandRepository.findById(request.getBandId())
                .orElseThrow(() -> new IllegalArgumentException("Band nicht gefunden: " + request.getBandId()));
        existing.setTitle(request.getTitle());
        existing.setDateTime(request.getDateTime());
        existing.setType(request.getType());
        existing.setBand(band);
        return EventResponse.from(eventRepository.save(existing));
    }

    public List<EventResponse> findAllEvents() {
        return eventRepository.findAll().stream().map(EventResponse::from).toList();
    }

    public void deleteEvent(Long id) {
        eventRepository.deleteById(id);
    }
}
