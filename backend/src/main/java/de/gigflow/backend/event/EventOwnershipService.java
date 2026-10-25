package de.gigflow.backend.event;

import de.gigflow.backend.equipment.EquipmentRequirementRepository;
import de.gigflow.backend.location.EventLocationRepository;
import de.gigflow.backend.schedule.ScheduleItemRepository;
import de.gigflow.backend.setlist.PieceDemoAudioRepository;
import de.gigflow.backend.setlist.PieceLinkRepository;
import de.gigflow.backend.setlist.PieceRepository;
import de.gigflow.backend.setlist.PieceSheetRepository;
import de.gigflow.backend.setlist.SetlistEntryRepository;
import de.gigflow.backend.setlist.SetlistRepository;
import de.gigflow.backend.user.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class EventOwnershipService {

    private final EventRepository eventRepository;
    private final EventParticipationRepository participationRepository;
    private final EventLocationRepository locationRepository;
    private final ScheduleItemRepository scheduleItemRepository;
    private final EquipmentRequirementRepository requirementRepository;
    private final SetlistRepository setlistRepository;
    private final SetlistEntryRepository entryRepository;
    private final PieceRepository pieceRepository;
    private final PieceSheetRepository sheetRepository;
    private final PieceLinkRepository linkRepository;
    private final PieceDemoAudioRepository demoAudioRepository;
    private final EventEditorRepository eventEditorRepository;

    public EventOwnershipService(
            EventRepository eventRepository,
            EventParticipationRepository participationRepository,
            EventLocationRepository locationRepository,
            ScheduleItemRepository scheduleItemRepository,
            EquipmentRequirementRepository requirementRepository,
            SetlistRepository setlistRepository,
            SetlistEntryRepository entryRepository,
            PieceRepository pieceRepository,
            PieceSheetRepository sheetRepository,
            PieceLinkRepository linkRepository,
            PieceDemoAudioRepository demoAudioRepository,
            EventEditorRepository eventEditorRepository) {
        this.eventRepository = eventRepository;
        this.participationRepository = participationRepository;
        this.locationRepository = locationRepository;
        this.scheduleItemRepository = scheduleItemRepository;
        this.requirementRepository = requirementRepository;
        this.setlistRepository = setlistRepository;
        this.entryRepository = entryRepository;
        this.pieceRepository = pieceRepository;
        this.sheetRepository = sheetRepository;
        this.linkRepository = linkRepository;
        this.demoAudioRepository = demoAudioRepository;
        this.eventEditorRepository = eventEditorRepository;
    }

    public boolean ownsEvent(AuthenticatedUser user, Long eventId) {
        if (user == null || eventId == null) {
            return false;
        }
        return eventRepository.findById(eventId)
                .map(event -> Objects.equals(event.getCreatedByUserId(), user.userId()))
                .orElse(false);
    }

    public boolean isEventParticipant(AuthenticatedUser user, Long eventId) {
        return user != null && user.musicianId() != null && eventId != null
                && participationRepository.existsByEventIdAndMusicianId(eventId, user.musicianId());
    }

    public boolean canViewEvent(AuthenticatedUser user, Long eventId) {
        if (user == null || eventId == null) {
            return false;
        }
        if (ownsEvent(user, eventId) || isEventParticipant(user, eventId)) {
            return true;
        }
        return eventRepository.findById(eventId)
                .map(event -> event.getConcert() != null
                        && (ownsEvent(user, event.getConcert().getId())
                        || isEventParticipant(user, event.getConcert().getId())))
                .orElse(false);
    }

    public boolean canEditEvent(AuthenticatedUser user, Long eventId) {
        if (ownsEvent(user, eventId)) {
            return true;
        }
        if (!isEventParticipant(user, eventId)) {
            return false;
        }
        return eventRepository.findById(eventId)
                .map(event -> switch (event.getEditPolicy()) {
                    case OWNER_ONLY -> false;
                    case ALL_PARTICIPANTS -> true;
                    case SELECTED_PARTICIPANTS -> eventEditorRepository
                            .existsByEventIdAndUserId(eventId, user.userId());
                })
                .orElse(false);
    }

    public boolean canManageParticipation(AuthenticatedUser user, Long participationId) {
        if (user == null) {
            return false;
        }
        return participationRepository.findById(participationId)
                .map(participation -> ownsEvent(user, participation.getEvent().getId())
                        || (user.musicianId() != null
                        && user.musicianId().equals(participation.getMusician().getId())))
                .orElse(false);
    }

    public boolean canManageLocation(AuthenticatedUser user, Long locationId) {
        return user != null && locationRepository.findById(locationId)
                .map(location -> canEditEvent(user, location.getEvent().getId()))
                .orElse(false);
    }

    public boolean canManageScheduleItem(AuthenticatedUser user, Long itemId) {
        return user != null && scheduleItemRepository.findById(itemId)
                .map(item -> canEditEvent(user, item.getEvent().getId()))
                .orElse(false);
    }

    public boolean canManageRequirement(AuthenticatedUser user, Long requirementId) {
        return user != null && requirementRepository.findById(requirementId)
                .map(item -> canEditEvent(user, item.getEvent().getId()))
                .orElse(false);
    }

    public boolean canManageSetlist(AuthenticatedUser user, Long setlistId) {
        return user != null && setlistRepository.findById(setlistId)
                .map(setlist -> canEditEvent(user, setlist.getEvent().getId()))
                .orElse(false);
    }

    public boolean canViewSetlist(AuthenticatedUser user, Long setlistId) {
        return user != null && setlistRepository.findById(setlistId)
                .map(setlist -> canViewEvent(user, setlist.getEvent().getId()))
                .orElse(false);
    }

    public boolean canViewSetlistEntry(AuthenticatedUser user, Long entryId) {
        return user != null && entryRepository.findById(entryId)
                .map(entry -> canViewSetlist(user, entry.getSetlist().getId()))
                .orElse(false);
    }

    public boolean canManageSetlistEntry(AuthenticatedUser user, Long entryId) {
        return user != null && entryRepository.findById(entryId)
                .map(entry -> canManageSetlist(user, entry.getSetlist().getId()))
                .orElse(false);
    }

    public boolean canManagePiece(AuthenticatedUser user, Long pieceId) {
        if (user == null) {
            return false;
        }
        return pieceRepository.findById(pieceId)
                .map(piece -> {
                    var entries = entryRepository.findByPiece_Id(pieceId);
                    if (!entries.isEmpty()) {
                        return entries.stream()
                                .allMatch(entry -> canEditEvent(user, entry.getSetlist().getEvent().getId()));
                    }
                    return Objects.equals(piece.getCreatedByUserId(), user.userId());
                })
                .orElse(false);
    }

    public boolean canViewPiece(AuthenticatedUser user, Long pieceId) {
        if (user == null) {
            return false;
        }
        return pieceRepository.findById(pieceId)
                .map(piece -> {
                    var entries = entryRepository.findByPiece_Id(pieceId);
                    if (!entries.isEmpty()) {
                        return entries.stream()
                                .anyMatch(entry -> canViewEvent(user, entry.getSetlist().getEvent().getId()));
                    }
                    return Objects.equals(piece.getCreatedByUserId(), user.userId());
                })
                .orElse(false);
    }

    public boolean canManageSheet(AuthenticatedUser user, Long sheetId) {
        return user != null && sheetRepository.findById(sheetId)
                .map(sheet -> canManagePiece(user, sheet.getPieceId()))
                .orElse(false);
    }

    public boolean canViewSheet(AuthenticatedUser user, Long sheetId) {
        return user != null && sheetRepository.findById(sheetId)
                .map(sheet -> canViewPiece(user, sheet.getPieceId()))
                .orElse(false);
    }

    public boolean canViewDemoAudio(AuthenticatedUser user, Long audioId) {
        return user != null && demoAudioRepository.findById(audioId)
                .map(audio -> canViewPiece(user, audio.getPieceId()))
                .orElse(false);
    }

    public boolean canManageLink(AuthenticatedUser user, Long linkId) {
        return user != null && linkRepository.findById(linkId)
                .map(link -> canManagePiece(user, link.getPieceId()))
                .orElse(false);
    }

    public boolean canManageDemoAudio(AuthenticatedUser user, Long audioId) {
        return user != null && demoAudioRepository.findById(audioId)
                .map(audio -> canManagePiece(user, audio.getPieceId()))
                .orElse(false);
    }
}
