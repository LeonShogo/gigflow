package de.gigflow.backend.event;

import de.gigflow.backend.band.Band;
import de.gigflow.backend.band.BandRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
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
        Event concert = resolveConcert(request.getConcertId());
        Event event = new Event();
        event.setTitle(request.getTitle());
        event.setDateTime(request.getDateTime());
        event.setType(request.getType());
        event.setBand(band);
        event.setConcert(concert);
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
        Event concert = resolveConcert(request.getConcertId());
        existing.setTitle(request.getTitle());
        existing.setDateTime(request.getDateTime());
        existing.setType(request.getType());
        existing.setBand(band);
        existing.setConcert(concert);
        return EventResponse.from(eventRepository.save(existing));
    }

    private Event resolveConcert(Long concertId) {
        if (concertId == null) {
            return null;
        }
        Event concert = eventRepository.findById(concertId)
                .orElseThrow(() -> new IllegalArgumentException("Konzert nicht gefunden: " + concertId));
        if (concert.getType() != EventType.CONCERT) {
            throw new IllegalArgumentException("Referenziertes Event ist kein Konzert: " + concertId);
        }
        return concert;
    }

    public List<EventResponse> findAllEvents() {
        return eventRepository.findAll().stream().map(EventResponse::from).toList();
    }

    public List<EventResponse> findRehearsalsByConcert(Long concertId) {
        return eventRepository.findByConcertId(concertId).stream()
                .filter(e -> e.getType() == EventType.REHEARSAL)
                .sorted(Comparator.comparing(Event::getDateTime))
                .map(EventResponse::from)
                .toList();
    }

    public Optional<PanelLayout> findPanelLayout(Long eventId) {
        return eventRepository.findById(eventId).map(event -> PanelLayout.fromStored(event.getPanelLayout()));
    }

    public Optional<PanelLayout> updatePanelLayout(Long eventId, PanelLayout layout) {
        Optional<Event> byId = eventRepository.findById(eventId);
        if (byId.isEmpty()) {
            return Optional.empty();
        }
        Event event = byId.get();
        event.setPanelLayout(layout.toStored());
        eventRepository.save(event);
        return Optional.of(layout);
    }

    public void deleteEvent(Long id) {
        eventRepository.deleteById(id);
    }
}
