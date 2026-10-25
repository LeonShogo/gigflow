package de.gigflow.backend.event;

import de.gigflow.backend.band.Band;
import de.gigflow.backend.band.BandRepository;
import de.gigflow.backend.equipment.EquipmentRequirement;
import de.gigflow.backend.equipment.EquipmentRequirementRepository;
import de.gigflow.backend.location.EventLocation;
import de.gigflow.backend.location.EventLocationRepository;
import de.gigflow.backend.schedule.ScheduleItem;
import de.gigflow.backend.schedule.ScheduleItemRepository;
import de.gigflow.backend.setlist.Setlist;
import de.gigflow.backend.setlist.SetlistEntry;
import de.gigflow.backend.setlist.SetlistEntryRepository;
import de.gigflow.backend.setlist.SetlistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final BandRepository bandRepository;
    private final EventParticipationRepository participationRepository;
    private final SetlistRepository setlistRepository;
    private final SetlistEntryRepository setlistEntryRepository;
    private final ScheduleItemRepository scheduleItemRepository;
    private final EventLocationRepository eventLocationRepository;
    private final EquipmentRequirementRepository equipmentRequirementRepository;

    public EventService(
            EventRepository eventRepository,
            BandRepository bandRepository,
            EventParticipationRepository participationRepository,
            SetlistRepository setlistRepository,
            SetlistEntryRepository setlistEntryRepository,
            ScheduleItemRepository scheduleItemRepository,
            EventLocationRepository eventLocationRepository,
            EquipmentRequirementRepository equipmentRequirementRepository) {
        this.eventRepository = eventRepository;
        this.bandRepository = bandRepository;
        this.participationRepository = participationRepository;
        this.setlistRepository = setlistRepository;
        this.setlistEntryRepository = setlistEntryRepository;
        this.scheduleItemRepository = scheduleItemRepository;
        this.eventLocationRepository = eventLocationRepository;
        this.equipmentRequirementRepository = equipmentRequirementRepository;
    }

    public EventResponse createEvent(EventRequest request, Long createdByUserId) {
        Band band = bandRepository.findById(request.getBandId())
                .orElseThrow(() -> new IllegalArgumentException("Band nicht gefunden: " + request.getBandId()));
        Event concert = resolveConcert(request.getConcertId());
        Event event = new Event();
        event.setTitle(request.getTitle());
        event.setDateTime(request.getDateTime());
        event.setType(request.getType());
        event.setBand(band);
        event.setConcert(concert);
        event.setCreatedByUserId(createdByUserId);
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
        layout.setStored(true);
        return Optional.of(layout);
    }

    @Transactional
    public void deleteEvent(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + id));
        deleteEventDeep(event);
    }

    /**
     * Deletes every event including all dependent data. Events already removed
     * as part of a concert cleanup are skipped because they no longer exist.
     */
    @Transactional
    public void deleteAllEvents(Long createdByUserId) {
        List<Long> ids = eventRepository.findAll().stream()
                .filter(event -> createdByUserId != null && createdByUserId.equals(event.getCreatedByUserId()))
                .map(Event::getId)
                .toList();
        for (Long id : ids) {
            eventRepository.findById(id).ifPresent(this::deleteEventDeep);
        }
    }

    /**
     * Deletes an event together with all of its dependent data so no orphaned or
     * dangling records remain. If the event is a concert, its linked rehearsals
     * are deleted first (they belong to the gig). Each rehearsal is itself an
     * event, so it is cleaned up recursively via {@link #deleteEventDeep(Event)}.
     */
    private void deleteEventDeep(Event event) {
        // Rehearsals pointing to this concert are fully deleted together with their dependents.
        List<Event> linkedRehearsals = eventRepository.findByConcertId(event.getId()).stream()
                .filter(e -> e.getType() == EventType.REHEARSAL)
                .toList();
        for (Event rehearsal : linkedRehearsals) {
            deleteEventDeep(rehearsal);
        }

        // Setlist (one-to-one) and its entries.
        Optional<Setlist> setlist = setlistRepository.findByEventId(event.getId());
        setlist.ifPresent(sl -> {
            List<SetlistEntry> entries = setlistEntryRepository.findBySetlistIdOrderByPositionAsc(sl.getId());
            setlistEntryRepository.deleteAll(entries);
            setlistRepository.delete(sl);
        });

        participationRepository.deleteAll(participationRepository.findByEventId(event.getId()));
        scheduleItemRepository.deleteAll(scheduleItemRepository.findByEventId(event.getId()));
        eventLocationRepository.deleteAll(eventLocationRepository.findByEventId(event.getId()));
        equipmentRequirementRepository.deleteAll(equipmentRequirementRepository.findByEventId(event.getId()));

        eventRepository.delete(event);
    }
}
