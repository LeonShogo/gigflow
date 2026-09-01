package de.gigflow.backend.event;

import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.musician.MusicianRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
}
