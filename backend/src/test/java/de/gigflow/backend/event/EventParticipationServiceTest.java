package de.gigflow.backend.event;

import de.gigflow.backend.band.Band;
import de.gigflow.backend.band.BandMembership;
import de.gigflow.backend.band.BandMembershipRepository;
import de.gigflow.backend.band.BandRepository;
import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.musician.MusicianRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventParticipationServiceTest {

    @Mock
    private EventParticipationRepository participationRepository;
    @Mock
    private EventRepository eventRepository;
    @Mock
    private MusicianRepository musicianRepository;
    @Mock
    private BandMembershipRepository bandMembershipRepository;
    @Mock
    private BandRepository bandRepository;

    @InjectMocks
    private EventParticipationService participationService;

    @Test
    void joinSelfCreatesAcceptedParticipation() {
        Event event = new Event();
        event.setId(10L);
        Musician musician = new Musician();
        musician.setId(3L);
        when(eventRepository.findById(10L)).thenReturn(Optional.of(event));
        when(musicianRepository.findById(3L)).thenReturn(Optional.of(musician));
        when(participationRepository.findByEventIdAndMusicianId(10L, 3L)).thenReturn(Optional.empty());

        EventParticipation saved = new EventParticipation();
        saved.setId(1L);
        saved.setEvent(event);
        saved.setMusician(musician);
        saved.setStatus(EventParticipationStatus.ACCEPTED);
        when(participationRepository.save(any(EventParticipation.class))).thenReturn(saved);

        EventParticipationResponseDto result = participationService.joinSelf(10L, 3L);

        assertThat(result.getStatus()).isEqualTo(EventParticipationStatus.ACCEPTED);
        assertThat(result.getEventId()).isEqualTo(10L);
        assertThat(result.getMusicianId()).isEqualTo(3L);
    }

    @Test
    void joinSelfIsIdempotentWhenAlreadyJoined() {
        EventParticipation existing = new EventParticipation();
        existing.setId(9L);
        existing.setStatus(EventParticipationStatus.ACCEPTED);
        when(participationRepository.findByEventIdAndMusicianId(10L, 3L)).thenReturn(Optional.of(existing));

        EventParticipationResponseDto result = participationService.joinSelf(10L, 3L);

        assertThat(result.getId()).isEqualTo(9L);
        verify(participationRepository, never()).save(any());
    }

    @Test
    void joinSelfRejectsUnknownEvent() {
        when(eventRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> participationService.joinSelf(999L, 3L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void inviteBandMembersInvitesAllMissingBandMembers() {
        Band band = new Band();
        band.setId(8L);
        Event event = new Event();
        event.setId(10L);

        Musician anna = new Musician();
        anna.setId(3L);
        anna.setFirstName("Anna");
        anna.setLastName("Becker");
        Musician ben = new Musician();
        ben.setId(5L);
        ben.setFirstName("Ben");
        ben.setLastName("Krüger");

        BandMembership m1 = new BandMembership();
        m1.setBand(band);
        m1.setMusician(anna);
        BandMembership m2 = new BandMembership();
        m2.setBand(band);
        m2.setMusician(ben);

        when(eventRepository.findById(10L)).thenReturn(Optional.of(event));
        when(bandRepository.existsById(8L)).thenReturn(true);
        when(bandMembershipRepository.findByBandId(8L)).thenReturn(List.of(m1, m2));
        when(participationRepository.existsByEventIdAndMusicianId(10L, 3L)).thenReturn(true);
        when(participationRepository.existsByEventIdAndMusicianId(10L, 5L)).thenReturn(false);

        EventParticipation saved = new EventParticipation();
        saved.setId(20L);
        saved.setEvent(event);
        saved.setMusician(ben);
        saved.setStatus(EventParticipationStatus.INVITED);
        when(participationRepository.findByEventId(10L)).thenReturn(List.of(saved));

        var result = participationService.inviteBandMembers(10L, 8L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMusicianId()).isEqualTo(5L);
        assertThat(result.get(0).getStatus()).isEqualTo(EventParticipationStatus.INVITED);
        verify(participationRepository).saveAll(anyList());
    }

    @Test
    void inviteBandMembersRejectsUnknownBand() {
        Event event = new Event();
        event.setId(10L);
        when(eventRepository.findById(10L)).thenReturn(Optional.of(event));
        when(bandRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> participationService.inviteBandMembers(10L, 999L))
                .isInstanceOf(IllegalArgumentException.class);
        verify(participationRepository, never()).saveAll(anyList());
    }
}
