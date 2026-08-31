package de.gigflow.backend.setlist;

import de.gigflow.backend.event.Event;
import de.gigflow.backend.event.EventRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SetlistService {

    private final SetlistRepository setlistRepository;
    private final EventRepository eventRepository;

    public SetlistService(SetlistRepository setlistRepository, EventRepository eventRepository) {
        this.setlistRepository = setlistRepository;
        this.eventRepository = eventRepository;
    }

    public SetlistResponse createSetlist(SetlistRequest request) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + request.getEventId()));
        Setlist setlist = new Setlist();
        setlist.setEvent(event);
        return SetlistResponse.from(setlistRepository.save(setlist));
    }

    public Optional<SetlistResponse> findSetlistById(Long id) {
        return setlistRepository.findById(id).map(SetlistResponse::from);
    }

    public Optional<SetlistResponse> findSetlistByEvent(Long eventId) {
        return setlistRepository.findByEventId(eventId).map(SetlistResponse::from);
    }

    public List<SetlistResponse> findAllSetlists() {
        return setlistRepository.findAll().stream().map(SetlistResponse::from).toList();
    }

    public SetlistResponse updateSetlist(Long id, SetlistRequest request) {
        Setlist existing = setlistRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Setlist nicht gefunden: " + id));
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + request.getEventId()));
        existing.setEvent(event);
        return SetlistResponse.from(setlistRepository.save(existing));
    }

    public void deleteSetlist(Long id) {
        setlistRepository.deleteById(id);
    }
}
