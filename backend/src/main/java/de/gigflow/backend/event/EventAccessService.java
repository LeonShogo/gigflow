package de.gigflow.backend.event;

import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.user.AuthenticatedUser;
import de.gigflow.backend.user.User;
import de.gigflow.backend.user.UserContactService;
import de.gigflow.backend.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class EventAccessService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;

    private final EventRepository eventRepository;
    private final EventParticipationRepository participationRepository;
    private final EventEditorRepository editorRepository;
    private final EventInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final UserContactService contactService;
    private final EventParticipationService participationService;
    private final String publicBaseUrl;

    public EventAccessService(
            EventRepository eventRepository,
            EventParticipationRepository participationRepository,
            EventEditorRepository editorRepository,
            EventInvitationRepository invitationRepository,
            UserRepository userRepository,
            UserContactService contactService,
            EventParticipationService participationService,
            @Value("${app.public-base-url:http://localhost:4200}") String publicBaseUrl) {
        this.eventRepository = eventRepository;
        this.participationRepository = participationRepository;
        this.editorRepository = editorRepository;
        this.invitationRepository = invitationRepository;
        this.userRepository = userRepository;
        this.contactService = contactService;
        this.participationService = participationService;
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
    }

    @Transactional(readOnly = true)
    public EventAccessResponse getEditingConfig(Long eventId, AuthenticatedUser owner) {
        requireOwner(owner, eventId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden."));
        List<Long> editorIds = editorRepository.findByEventId(eventId).stream()
                .map(editor -> editor.getUser().getId())
                .toList();
        return new EventAccessResponse(event.getEditPolicy(), editorIds);
    }

    @Transactional(readOnly = true)
    public void validateEditorSelection(AuthenticatedUser owner, List<Long> editorUserIds) {
        if (owner == null) {
            throw new IllegalArgumentException("Bitte melde dich an.");
        }
        for (Long editorId : new LinkedHashSet<>(editorUserIds)) {
            if (!contactService.isKnownContact(owner, editorId)) {
                throw new IllegalArgumentException("Ausgewählte Konten müssen zu deinen bekannten Kontakten gehören.");
            }
            User editor = userRepository.findById(editorId)
                    .orElseThrow(() -> new IllegalArgumentException("Konto nicht gefunden."));
            if (editor.getMusician() == null) {
                throw new IllegalArgumentException("Für dieses Konto ist kein Musikerprofil verknüpft.");
            }
        }
    }

    @Transactional
    public EventAccessResponse configureEditing(Long eventId, AuthenticatedUser owner, EventAccessRequest request) {
        requireOwner(owner, eventId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden."));
        EventEditPolicy policy = request.getEditPolicy() == null
                ? EventEditPolicy.OWNER_ONLY
                : request.getEditPolicy();
        Set<Long> editorIds = new LinkedHashSet<>(request.getEditorUserIds());
        if (policy == EventEditPolicy.SELECTED_PARTICIPANTS) {
            validateEditorSelection(owner, List.copyOf(editorIds));
        }
        editorRepository.deleteByEventId(eventId);

        if (policy == EventEditPolicy.SELECTED_PARTICIPANTS) {
            for (Long editorId : editorIds) {
                addKnownMember(event, editorId);
                User editorUser = userRepository.findById(editorId)
                        .orElseThrow(() -> new IllegalArgumentException("Konto nicht gefunden."));
                EventEditor editor = new EventEditor();
                editor.setEvent(event);
                editor.setUser(editorUser);
                editorRepository.save(editor);
            }
        }
        event.setEditPolicy(policy);
        eventRepository.save(event);
        List<Long> configuredEditors = policy == EventEditPolicy.SELECTED_PARTICIPANTS
                ? List.copyOf(editorIds)
                : List.of();
        return new EventAccessResponse(policy, configuredEditors);
    }

    @Transactional
    public List<EventParticipationResponseDto> addKnownMembers(
            Long eventId, AuthenticatedUser owner, List<Long> userIds) {
        requireOwner(owner, eventId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden."));
        Set<Long> uniqueIds = new LinkedHashSet<>(userIds);
        List<EventParticipationResponseDto> result = new ArrayList<>();
        for (Long userId : uniqueIds) {
            if (!contactService.isKnownContact(owner, userId)) {
                throw new IllegalArgumentException("Dieses Konto ist noch kein bekannter Kontakt.");
            }
            EventParticipationResponseDto participation = addKnownMember(event, userId);
            result.add(participation);
        }
        return result;
    }

    private EventParticipationResponseDto addKnownMember(Event event, Long userId) {
        User member = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Konto nicht gefunden."));
        Musician musician = member.getMusician();
        if (musician == null) {
            throw new IllegalArgumentException("Für dieses Konto ist kein Musikerprofil verknüpft.");
        }
        var existing = participationRepository.findByEventIdAndMusicianId(event.getId(), musician.getId());
        EventParticipationResponseDto dto;
        if (existing.isPresent()) {
            EventParticipation participation = existing.get();
            if (participation.getStatus() == EventParticipationStatus.DECLINED) {
                participation.setStatus(EventParticipationStatus.INVITED);
                dto = EventParticipationResponseDto.from(participationRepository.save(participation));
            } else {
                dto = EventParticipationResponseDto.from(participation);
            }
        } else {
            dto = participationService.createParticipation(new EventParticipationRequestDto(
                    event.getId(), musician.getId(), EventParticipationStatus.INVITED));
        }
        return dto;
    }

    @Transactional
    public EventInvitationResponse createInvitationLink(Long eventId, AuthenticatedUser owner) {
        requireOwner(owner, eventId);
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden."));
        invitationRepository.findByEventIdAndStatus(eventId, EventInvitationStatus.PENDING)
                .forEach(pending -> {
                    pending.setStatus(EventInvitationStatus.REVOKED);
                    invitationRepository.save(pending);
                });
        String token = generateToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);
        EventInvitation invitation = new EventInvitation();
        invitation.setEvent(event);
        invitation.setEmail(null);
        invitation.setTokenHash(hashToken(token));
        invitation.setInvitedByUserId(owner.userId());
        invitation.setStatus(EventInvitationStatus.PENDING);
        invitation.setExpiresAt(expiresAt);
        invitationRepository.save(invitation);
        return new EventInvitationResponse(publicBaseUrl + "/invitations/accept?token=" + token, expiresAt);
    }

    @Transactional
    public EventResponse acceptInvitation(String token, AuthenticatedUser currentUser, String currentEmail) {
        if (currentUser == null || currentUser.musicianId() == null) {
            throw new IllegalArgumentException("Bitte melde dich mit einem Musikerprofil an.");
        }
        EventInvitation invitation = invitationRepository.findByTokenHash(hashToken(token))
                .orElseThrow(() -> new IllegalArgumentException("Einladungslink ist ungültig oder wurde bereits verwendet."));
        if (invitation.getStatus() != EventInvitationStatus.PENDING
                || invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Einladungslink ist abgelaufen oder wurde bereits verwendet.");
        }
        if (invitation.getEmail() != null
                && !normalizeEmail(invitation.getEmail()).equals(normalizeEmail(currentEmail))) {
            throw new IllegalArgumentException("Bitte melde dich mit der eingeladenen E-Mail-Adresse an.");
        }

        EventParticipation participation = participationRepository
                .findByEventIdAndMusicianId(invitation.getEvent().getId(), currentUser.musicianId())
                .orElseGet(() -> {
                    EventParticipation created = new EventParticipation();
                    created.setEvent(invitation.getEvent());
                    created.setMusician(userRepository.findById(currentUser.userId())
                            .map(User::getMusician)
                            .orElseThrow(() -> new IllegalArgumentException("Musikerprofil nicht gefunden.")));
                    created.setStatus(EventParticipationStatus.ACCEPTED);
                    return created;
                });
        participation.setStatus(EventParticipationStatus.ACCEPTED);
        participationRepository.save(participation);
        invitation.setStatus(EventInvitationStatus.ACCEPTED);
        invitation.setAcceptedByUserId(currentUser.userId());
        invitation.setAcceptedAt(LocalDateTime.now());
        invitationRepository.save(invitation);
        return EventResponse.from(invitation.getEvent());
    }

    @Transactional
    public void leaveEvent(Long eventId, AuthenticatedUser currentUser) {
        if (currentUser == null || currentUser.musicianId() == null) {
            throw new IllegalArgumentException("Kein Musikerprofil mit diesem Konto verknüpft.");
        }
        if (eventRepository.findById(eventId).map(event -> event.getCreatedByUserId() != null
                && event.getCreatedByUserId().equals(currentUser.userId())).orElse(false)) {
            throw new IllegalArgumentException("Der*die Event-Ersteller*in kann das Event nicht selbst verlassen.");
        }
        participationRepository.findByEventIdAndMusicianId(eventId, currentUser.musicianId())
                .ifPresent(participationRepository::delete);
        editorRepository.deleteByEventIdAndUserId(eventId, currentUser.userId());
    }

    private void requireOwner(AuthenticatedUser user, Long eventId) {
        if (user == null || eventId == null || !eventRepository.findById(eventId)
                .map(event -> user.userId().equals(event.getCreatedByUserId())).orElse(false)) {
            throw new IllegalArgumentException("Nur der*die Ersteller*in kann die Event-Zugriffe verwalten.");
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 ist nicht verfügbar.", exception);
        }
    }
}
