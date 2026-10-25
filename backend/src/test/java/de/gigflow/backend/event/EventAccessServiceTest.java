package de.gigflow.backend.event;

import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.user.AuthenticatedUser;
import de.gigflow.backend.user.User;
import de.gigflow.backend.user.UserContactService;
import de.gigflow.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EventAccessServiceTest {

    private EventRepository eventRepository;
    private EventParticipationRepository participationRepository;
    private EventEditorRepository editorRepository;
    private EventInvitationRepository invitationRepository;
    private UserRepository userRepository;
    private UserContactService contactService;
    private EventMailService mailService;
    private EventParticipationService participationService;
    private EventAccessService accessService;

    @BeforeEach
    void setUp() {
        eventRepository = mock(EventRepository.class);
        participationRepository = mock(EventParticipationRepository.class);
        editorRepository = mock(EventEditorRepository.class);
        invitationRepository = mock(EventInvitationRepository.class);
        userRepository = mock(UserRepository.class);
        contactService = mock(UserContactService.class);
        mailService = mock(EventMailService.class);
        participationService = mock(EventParticipationService.class);
        accessService = new EventAccessService(
                eventRepository,
                participationRepository,
                editorRepository,
                invitationRepository,
                userRepository,
                contactService,
                mailService,
                participationService,
                "https://gigflow.example");
    }

    @Test
    void emailInviteReturnsCopyableLinkAndOnlyStoresTokenHash() {
        Event event = new Event();
        event.setId(12L);
        event.setTitle("Sommergig");
        event.setCreatedByUserId(4L);
        when(eventRepository.findById(12L)).thenReturn(Optional.of(event));
        when(userRepository.findByEmail("neu@example.org")).thenReturn(Optional.empty());
        when(invitationRepository.findByEventIdAndEmailAndStatus(
                12L, "neu@example.org", EventInvitationStatus.PENDING)).thenReturn(Optional.empty());
        when(mailService.sendInvitation(eq("neu@example.org"), eq("Sommergig"), any())).thenReturn(false);

        List<EventInvitationResponse> response = accessService.inviteEmails(
                12L, new AuthenticatedUser(4L, 4L), List.of(" Neu@Example.org "));

        assertEquals(1, response.size());
        assertFalse(response.getFirst().isEmailSent());
        assertNotNull(response.getFirst().getInvitationUrl());
        assertEquals("neu@example.org", response.getFirst().getEmail());
        ArgumentCaptor<EventInvitation> invitationCaptor = ArgumentCaptor.forClass(EventInvitation.class);
        verify(invitationRepository).save(invitationCaptor.capture());
        assertEquals(64, invitationCaptor.getValue().getTokenHash().length());
        assertFalse(response.getFirst().getInvitationUrl().contains(invitationCaptor.getValue().getTokenHash()));
    }

    @Test
    void invitationCanOnlyBeAcceptedByTheInvitedEmailAndJoinsEvent() {
        Event event = new Event();
        event.setId(12L);
        event.setTitle("Sommergig");
        EventInvitation invitation = new EventInvitation();
        invitation.setEvent(event);
        invitation.setEmail("invitee@example.org");
        invitation.setTokenHash("token-hash");
        invitation.setStatus(EventInvitationStatus.PENDING);
        invitation.setExpiresAt(java.time.LocalDateTime.now().plusDays(1));
        when(invitationRepository.findByTokenHash(any())).thenReturn(Optional.of(invitation));

        AuthenticatedUser currentUser = new AuthenticatedUser(9L, 90L);
        assertThrows(IllegalArgumentException.class,
                () -> accessService.acceptInvitation("token", currentUser, "other@example.org"));

        Musician musician = new Musician();
        musician.setId(90L);
        User user = new User();
        user.setId(9L);
        user.setEmail("invitee@example.org");
        user.setMusician(musician);
        when(participationRepository.findByEventIdAndMusicianId(12L, 90L)).thenReturn(Optional.empty());
        when(userRepository.findById(9L)).thenReturn(Optional.of(user));

        EventResponse accepted = accessService.acceptInvitation("token", currentUser, "INVITEE@example.org");

        assertEquals(12L, accepted.getId());
        assertEquals(EventInvitationStatus.ACCEPTED, invitation.getStatus());
        assertEquals(9L, invitation.getAcceptedByUserId());
        ArgumentCaptor<EventParticipation> participationCaptor = ArgumentCaptor.forClass(EventParticipation.class);
        verify(participationRepository).save(participationCaptor.capture());
        assertEquals(EventParticipationStatus.ACCEPTED, participationCaptor.getValue().getStatus());
        assertEquals(90L, participationCaptor.getValue().getMusician().getId());
        verify(invitationRepository).save(invitation);
    }
}
