package de.gigflow.backend.event;

import de.gigflow.backend.band.BandMembershipRepository;
import de.gigflow.backend.band.BandRepository;
import de.gigflow.backend.equipment.EquipmentRequirementRepository;
import de.gigflow.backend.location.EventLocation;
import de.gigflow.backend.location.EventLocationRepository;
import de.gigflow.backend.schedule.ScheduleItem;
import de.gigflow.backend.schedule.ScheduleItemRepository;
import de.gigflow.backend.setlist.Setlist;
import de.gigflow.backend.setlist.SetlistEntry;
import de.gigflow.backend.setlist.SetlistEntryRepository;
import de.gigflow.backend.setlist.SetlistRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    @Mock
    private EventRepository eventRepository;
    @Mock
    private BandRepository bandRepository;
    @Mock
    private EventParticipationRepository participationRepository;
    @Mock
    private SetlistRepository setlistRepository;
    @Mock
    private SetlistEntryRepository setlistEntryRepository;
    @Mock
    private ScheduleItemRepository scheduleItemRepository;
    @Mock
    private EventLocationRepository eventLocationRepository;
    @Mock
    private EquipmentRequirementRepository equipmentRequirementRepository;
    @Mock
    private EventEditorRepository eventEditorRepository;
    @Mock
    private EventInvitationRepository eventInvitationRepository;
    @Mock
    private BandMembershipRepository bandMembershipRepository;

    private EventService eventService;

    @BeforeEach
    void setUp() {
        eventService = new EventService(
                eventRepository, bandRepository, participationRepository, setlistRepository,
                setlistEntryRepository, scheduleItemRepository, eventLocationRepository,
                equipmentRequirementRepository, eventEditorRepository, eventInvitationRepository);
    }

    @Test
    void deleteEventCleansUpAllDependents() {
        Event concert = new Event();
        concert.setId(5L);
        when(eventRepository.findById(5L)).thenReturn(Optional.of(concert));
        when(eventRepository.findByConcertId(5L)).thenReturn(List.of());

        Setlist setlist = new Setlist();
        setlist.setId(1L);
        when(setlistRepository.findByEventId(5L)).thenReturn(Optional.of(setlist));

        SetlistEntry entry = new SetlistEntry();
        when(setlistEntryRepository.findBySetlistIdOrderByPositionAsc(1L)).thenReturn(List.of(entry));

        EventParticipation participation = new EventParticipation();
        when(participationRepository.findByEventId(5L)).thenReturn(List.of(participation));

        ScheduleItem schedule = new ScheduleItem();
        when(scheduleItemRepository.findByEventId(5L)).thenReturn(List.of(schedule));

        EventLocation location = new EventLocation();
        when(eventLocationRepository.findByEventId(5L)).thenReturn(List.of(location));

        when(equipmentRequirementRepository.findByEventId(5L)).thenReturn(List.of());

        eventService.deleteEvent(5L);

        verify(setlistEntryRepository).deleteAll(List.of(entry));
        verify(setlistRepository).delete(setlist);
        verify(participationRepository).deleteAll(List.of(participation));
        verify(scheduleItemRepository).deleteAll(List.of(schedule));
        verify(eventLocationRepository).deleteAll(List.of(location));
        verify(eventRepository).delete(concert);
    }

    @Test
    void deleteConcertAlsoDeletesLinkedRehearsalsRecursively() {
        Event concert = new Event();
        concert.setId(5L);
        Event rehearsal = new Event();
        rehearsal.setId(7L);
        rehearsal.setType(EventType.REHEARSAL);

        when(eventRepository.findById(5L)).thenReturn(Optional.of(concert));
        when(eventRepository.findByConcertId(5L)).thenReturn(List.of(rehearsal));
        when(eventRepository.findByConcertId(7L)).thenReturn(List.of());

        when(setlistRepository.findByEventId(5L)).thenReturn(Optional.empty());
        when(setlistRepository.findByEventId(7L)).thenReturn(Optional.empty());
        when(participationRepository.findByEventId(5L)).thenReturn(List.of());
        when(participationRepository.findByEventId(7L)).thenReturn(List.of());
        when(scheduleItemRepository.findByEventId(5L)).thenReturn(List.of());
        when(scheduleItemRepository.findByEventId(7L)).thenReturn(List.of());
        when(eventLocationRepository.findByEventId(5L)).thenReturn(List.of());
        when(eventLocationRepository.findByEventId(7L)).thenReturn(List.of());
        when(equipmentRequirementRepository.findByEventId(5L)).thenReturn(List.of());
        when(equipmentRequirementRepository.findByEventId(7L)).thenReturn(List.of());

        eventService.deleteEvent(5L);

        verify(eventRepository).delete(rehearsal);
        verify(eventRepository).delete(concert);
    }

    @Test
    void deleteEventThrowsWhenEventNotFound() {
        when(eventRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> eventService.deleteEvent(999L));
        verify(eventRepository, never()).delete(any(Event.class));
    }

    @Test
    void deleteAllEventsRemovesOnlyEventsOwnedByUser() {
        Event concert = new Event();
        concert.setId(5L);
        concert.setCreatedByUserId(7L);
        Event rehearsal = new Event();
        rehearsal.setId(7L);
        rehearsal.setType(EventType.REHEARSAL);
        rehearsal.setCreatedByUserId(7L);
        Event otherUserEvent = new Event();
        otherUserEvent.setId(8L);
        otherUserEvent.setCreatedByUserId(99L);

        when(eventRepository.findAll()).thenReturn(List.of(concert, rehearsal, otherUserEvent));
        when(eventRepository.findById(5L)).thenReturn(Optional.of(concert));
        when(eventRepository.findById(7L)).thenReturn(Optional.of(rehearsal));
        when(eventRepository.findByConcertId(5L)).thenReturn(List.of());
        when(eventRepository.findByConcertId(7L)).thenReturn(List.of());

        eventService.deleteAllEvents(7L);

        verify(eventRepository).delete(concert);
        verify(eventRepository).delete(rehearsal);
        verify(eventRepository, never()).delete(otherUserEvent);
    }
}
