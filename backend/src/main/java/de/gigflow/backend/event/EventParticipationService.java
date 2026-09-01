package de.gigflow.backend.event;

import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.musician.MusicianRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class EventParticipationService {

    private final EventParticipationRepository participationRepository;
    private final EventRepository eventRepository;
    private final MusicianRepository musicianRepository;

    public EventParticipationService(EventParticipationRepository participationRepository,
                                     EventRepository eventRepository,
                                     MusicianRepository musicianRepository) {
        this.participationRepository = participationRepository;
        this.eventRepository = eventRepository;
        this.musicianRepository = musicianRepository;
    }

    public EventParticipationResponseDto createParticipation(EventParticipationRequestDto request) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + request.getEventId()));
        Musician musician = musicianRepository.findById(request.getMusicianId())
                .orElseThrow(() -> new IllegalArgumentException("Musiker:in nicht gefunden: " + request.getMusicianId()));

        boolean exists = participationRepository.existsByEventIdAndMusicianId(event.getId(), musician.getId());
        if (exists) {
            throw new IllegalArgumentException("Musiker:in ist diesem Event bereits zugeordnet: " + musician.getId());
        }

        EventParticipation participation = new EventParticipation();
        participation.setEvent(event);
        participation.setMusician(musician);
        participation.setStatus(request.getStatus());
        return EventParticipationResponseDto.from(participationRepository.save(participation));
    }

    /**
     * Registers a musician for an event with status ACCEPTED. Idempotent: if a
     * participation already exists, the existing record is returned unchanged.
     */
    public EventParticipationResponseDto joinSelf(Long eventId, Long musicianId) {
        Optional<EventParticipation> existing =
                participationRepository.findByEventIdAndMusicianId(eventId, musicianId);
        if (existing.isPresent()) {
            return EventParticipationResponseDto.from(existing.get());
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + eventId));
        Musician musician = musicianRepository.findById(musicianId)
                .orElseThrow(() -> new IllegalArgumentException("Musiker:in nicht gefunden: " + musicianId));

        EventParticipation participation = new EventParticipation();
        participation.setEvent(event);
        participation.setMusician(musician);
        participation.setStatus(EventParticipationStatus.ACCEPTED);
        return EventParticipationResponseDto.from(participationRepository.save(participation));
    }

    @Transactional(readOnly = true)
    public Optional<EventParticipationResponseDto> findParticipationById(Long id) {
        return participationRepository.findById(id).map(EventParticipationResponseDto::from);
    }

    @Transactional(readOnly = true)
    public List<EventParticipationResponseDto> findAllParticipations() {
        return participationRepository.findAll().stream().map(EventParticipationResponseDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<EventParticipationResponseDto> findParticipationsByEvent(Long eventId) {
        return participationRepository.findByEventId(eventId).stream()
                .map(EventParticipationResponseDto::from)
                .toList();
    }

    public EventParticipationResponseDto updateParticipation(Long id, EventParticipationRequestDto request) {
        EventParticipation existing = participationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Teilnahme nicht gefunden: " + id));
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + request.getEventId()));
        Musician musician = musicianRepository.findById(request.getMusicianId())
                .orElseThrow(() -> new IllegalArgumentException("Musiker:in nicht gefunden: " + request.getMusicianId()));

        existing.setEvent(event);
        existing.setMusician(musician);
        existing.setStatus(request.getStatus());
        return EventParticipationResponseDto.from(participationRepository.save(existing));
    }

    public void deleteParticipation(Long id) {
        participationRepository.deleteById(id);
    }
}
