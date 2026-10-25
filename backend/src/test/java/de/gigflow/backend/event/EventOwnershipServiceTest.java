package de.gigflow.backend.event;

import de.gigflow.backend.equipment.EquipmentRequirementRepository;
import de.gigflow.backend.location.EventLocationRepository;
import de.gigflow.backend.schedule.ScheduleItemRepository;
import de.gigflow.backend.setlist.PieceDemoAudioRepository;
import de.gigflow.backend.setlist.PieceLinkRepository;
import de.gigflow.backend.setlist.PieceRepository;
import de.gigflow.backend.setlist.PieceSheetRepository;
import de.gigflow.backend.setlist.Setlist;
import de.gigflow.backend.setlist.SetlistEntry;
import de.gigflow.backend.setlist.SetlistEntryRepository;
import de.gigflow.backend.setlist.SetlistRepository;
import de.gigflow.backend.user.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EventOwnershipServiceTest {

    private EventRepository eventRepository;
    private EventParticipationRepository participationRepository;
    private EventLocationRepository locationRepository;
    private ScheduleItemRepository scheduleItemRepository;
    private EquipmentRequirementRepository requirementRepository;
    private SetlistRepository setlistRepository;
    private SetlistEntryRepository entryRepository;
    private PieceRepository pieceRepository;
    private PieceSheetRepository sheetRepository;
    private PieceLinkRepository linkRepository;
    private PieceDemoAudioRepository demoAudioRepository;
    private EventEditorRepository editorRepository;
    private EventOwnershipService ownershipService;

    @BeforeEach
    void setUp() {
        eventRepository = mock(EventRepository.class);
        participationRepository = mock(EventParticipationRepository.class);
        locationRepository = mock(EventLocationRepository.class);
        scheduleItemRepository = mock(ScheduleItemRepository.class);
        requirementRepository = mock(EquipmentRequirementRepository.class);
        setlistRepository = mock(SetlistRepository.class);
        entryRepository = mock(SetlistEntryRepository.class);
        pieceRepository = mock(PieceRepository.class);
        sheetRepository = mock(PieceSheetRepository.class);
        linkRepository = mock(PieceLinkRepository.class);
        demoAudioRepository = mock(PieceDemoAudioRepository.class);
        editorRepository = mock(EventEditorRepository.class);
        ownershipService = new EventOwnershipService(
                eventRepository,
                participationRepository,
                locationRepository,
                scheduleItemRepository,
                requirementRepository,
                setlistRepository,
                entryRepository,
                pieceRepository,
                sheetRepository,
                linkRepository,
                demoAudioRepository,
                editorRepository);
    }

    @Test
    void onlyTheEventCreatorCanManageTheEvent() {
        Event event = new Event();
        event.setId(12L);
        event.setCreatedByUserId(4L);
        when(eventRepository.findById(12L)).thenReturn(Optional.of(event));

        assertTrue(ownershipService.ownsEvent(new AuthenticatedUser(4L, 40L), 12L));
        assertFalse(ownershipService.ownsEvent(new AuthenticatedUser(5L, 50L), 12L));
        assertFalse(ownershipService.ownsEvent(null, 12L));
    }

    @Test
    void eventEditingPolicyControlsParticipatingAccounts() {
        Event event = new Event();
        event.setId(12L);
        event.setCreatedByUserId(4L);
        when(eventRepository.findById(12L)).thenReturn(Optional.of(event));
        when(participationRepository.existsByEventIdAndMusicianId(12L, 50L)).thenReturn(true);

        AuthenticatedUser participant = new AuthenticatedUser(9L, 50L);
        assertFalse(ownershipService.canEditEvent(participant, 12L));

        event.setEditPolicy(EventEditPolicy.ALL_PARTICIPANTS);
        assertTrue(ownershipService.canEditEvent(participant, 12L));

        event.setEditPolicy(EventEditPolicy.SELECTED_PARTICIPANTS);
        when(editorRepository.existsByEventIdAndUserId(12L, 9L)).thenReturn(true);
        assertTrue(ownershipService.canEditEvent(participant, 12L));
        when(editorRepository.existsByEventIdAndUserId(12L, 10L)).thenReturn(false);
        assertFalse(ownershipService.canEditEvent(new AuthenticatedUser(10L, 50L), 12L));
    }

    @Test
    void eventVisibilityRequiresOwnershipOrParticipation() {
        Event event = new Event();
        event.setId(12L);
        event.setCreatedByUserId(4L);
        when(eventRepository.findById(12L)).thenReturn(Optional.of(event));
        when(participationRepository.existsByEventIdAndMusicianId(12L, 50L)).thenReturn(true);

        assertTrue(ownershipService.canViewEvent(new AuthenticatedUser(4L, 40L), 12L));
        assertTrue(ownershipService.canViewEvent(new AuthenticatedUser(9L, 50L), 12L));
        assertFalse(ownershipService.canViewEvent(new AuthenticatedUser(10L, 60L), 12L));
    }

    @Test
    void aMusicianMayManageOnlyTheirOwnParticipationUnlessTheyOwnTheEvent() {
        Event event = new Event();
        event.setId(12L);
        event.setCreatedByUserId(4L);
        EventParticipation participation = new EventParticipation();
        participation.setEvent(event);
        de.gigflow.backend.musician.Musician musician = new de.gigflow.backend.musician.Musician();
        musician.setId(40L);
        participation.setMusician(musician);
        when(participationRepository.findById(30L)).thenReturn(Optional.of(participation));
        when(eventRepository.findById(12L)).thenReturn(Optional.of(event));

        assertTrue(ownershipService.canManageParticipation(new AuthenticatedUser(9L, 40L), 30L));
        assertTrue(ownershipService.canManageParticipation(new AuthenticatedUser(4L, 99L), 30L));
        assertFalse(ownershipService.canManageParticipation(new AuthenticatedUser(9L, 41L), 30L));
    }

    @Test
    void aTuneUsedOnlyByOwnedEventsCanBeManagedByThatEventOwner() {
        Event event = new Event();
        event.setId(12L);
        event.setCreatedByUserId(4L);
        Setlist setlist = new Setlist();
        setlist.setEvent(event);
        de.gigflow.backend.setlist.Piece piece = new de.gigflow.backend.setlist.Piece();
        piece.setId(80L);
        SetlistEntry entry = new SetlistEntry();
        entry.setSetlist(setlist);
        entry.setPiece(piece);
        when(pieceRepository.findById(80L)).thenReturn(Optional.of(piece));
        when(entryRepository.findByPiece_Id(80L)).thenReturn(List.of(entry));
        when(eventRepository.findById(12L)).thenReturn(Optional.of(event));

        assertTrue(ownershipService.canManagePiece(new AuthenticatedUser(4L, 40L), 80L));
        assertFalse(ownershipService.canManagePiece(new AuthenticatedUser(5L, 50L), 80L));
    }
}
