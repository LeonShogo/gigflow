package de.gigflow.backend.band;

import de.gigflow.backend.event.EventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BandServiceTest {

    @Mock
    private BandRepository bandRepository;
    @Mock
    private BandMembershipRepository membershipRepository;
    @Mock
    private EventRepository eventRepository;

    private BandService bandService;

    @BeforeEach
    void setUp() {
        bandService = new BandService(bandRepository, membershipRepository, eventRepository);
    }

    @Test
    void deleteBandRemovesMembershipsAndBand() {
        Band band = band(2L, "Nordlicht");
        BandMembership membership = new BandMembership();
        when(bandRepository.findById(2L)).thenReturn(Optional.of(band));
        when(membershipRepository.findByBandId(2L)).thenReturn(List.of(membership));

        bandService.deleteBand(2L);

        verify(membershipRepository).deleteAll(List.of(membership));
        verify(bandRepository).delete(band);
    }

    @Test
    void deleteBandRejectsBandsWithEvents() {
        Band band = band(2L, "Nordlicht");
        when(bandRepository.findById(2L)).thenReturn(Optional.of(band));
        when(eventRepository.existsByBandId(2L)).thenReturn(true);

        assertThatThrownBy(() -> bandService.deleteBand(2L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("noch Gigs/Proben zugeordnet");

        verify(membershipRepository, never()).deleteAll(org.mockito.ArgumentMatchers.anyList());
        verify(bandRepository, never()).delete(band);
    }

    @Test
    void deleteBandRejectsUnknownBand() {
        when(bandRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bandService.deleteBand(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Band nicht gefunden");

        verify(eventRepository, never()).existsByBandId(999L);
    }

    private Band band(Long id, String name) {
        Band band = new Band();
        band.setId(id);
        band.setName(name);
        return band;
    }
}
