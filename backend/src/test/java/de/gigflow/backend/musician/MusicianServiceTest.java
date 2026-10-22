package de.gigflow.backend.musician;

import de.gigflow.backend.band.BandMembershipRepository;
import de.gigflow.backend.equipment.EquipmentRequirement;
import de.gigflow.backend.equipment.EquipmentRequirementRepository;
import de.gigflow.backend.event.EventParticipation;
import de.gigflow.backend.event.EventParticipationRepository;
import de.gigflow.backend.user.User;
import de.gigflow.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MusicianServiceTest {

    @Mock
    private MusicianRepository musicianRepository;
    @Mock
    private EventParticipationRepository participationRepository;
    @Mock
    private BandMembershipRepository bandMembershipRepository;
    @Mock
    private EquipmentRequirementRepository equipmentRequirementRepository;
    @Mock
    private UserRepository userRepository;

    private MusicianService musicianService;

    @BeforeEach
    void setUp() {
        musicianService = new MusicianService(
                musicianRepository, participationRepository, bandMembershipRepository,
                equipmentRequirementRepository, userRepository);
    }

    @Test
    void deleteMusicianDeletesWhenNoDependents() {
        Musician musician = new Musician();
        musician.setId(2L);
        musician.setFirstName("Anna");
        musician.setLastName("Becker");
        when(musicianRepository.findById(2L)).thenReturn(Optional.of(musician));
        when(participationRepository.findByMusicianId(2L)).thenReturn(List.of());
        when(bandMembershipRepository.findByMusicianId(2L)).thenReturn(List.of());
        when(equipmentRequirementRepository.findByResponsibleMusicianId(2L)).thenReturn(List.of());
        when(userRepository.findByMusicianId(2L)).thenReturn(List.of());

        musicianService.deleteMusician(2L);

        verify(musicianRepository).delete(musician);
    }

    @Test
    void deleteMusicianBlocksWhenParticipationExists() {
        Musician musician = new Musician();
        musician.setId(2L);
        musician.setFirstName("Anna");
        musician.setLastName("Becker");
        EventParticipation participation = new EventParticipation();
        when(musicianRepository.findById(2L)).thenReturn(Optional.of(musician));
        when(participationRepository.findByMusicianId(2L)).thenReturn(List.of(participation));

        assertThatThrownBy(() -> musicianService.deleteMusician(2L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("noch zu Gigs/Proben zugeordnet");
        verify(musicianRepository, never()).delete(musician);
    }

    @Test
    void deleteMusicianBlocksWhenLinkedToUserAccount() {
        Musician musician = new Musician();
        musician.setId(2L);
        musician.setFirstName("Anna");
        musician.setLastName("Becker");
        User user = new User();
        when(musicianRepository.findById(2L)).thenReturn(Optional.of(musician));
        when(participationRepository.findByMusicianId(2L)).thenReturn(List.of());
        when(bandMembershipRepository.findByMusicianId(2L)).thenReturn(List.of());
        when(equipmentRequirementRepository.findByResponsibleMusicianId(2L)).thenReturn(List.of());
        when(userRepository.findByMusicianId(2L)).thenReturn(List.of(user));

        assertThatThrownBy(() -> musicianService.deleteMusician(2L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("verknüpftes Benutzerkonto");
        verify(musicianRepository, never()).delete(musician);
    }

    @Test
    void deleteAllMusiciansRemovesDependenciesAndUnlinksReferences() {
        Musician musician = new Musician();
        musician.setId(2L);
        EquipmentRequirement requirement = new EquipmentRequirement();
        requirement.setResponsibleMusician(musician);
        User user = new User();
        user.setMusician(musician);
        when(equipmentRequirementRepository.findAll()).thenReturn(List.of(requirement));
        when(userRepository.findAll()).thenReturn(List.of(user));

        musicianService.deleteAllMusicians();

        assertThat(requirement.getResponsibleMusician()).isNull();
        assertThat(user.getMusician()).isNull();
        verify(participationRepository).deleteAllInBatch();
        verify(bandMembershipRepository).deleteAllInBatch();
        verify(equipmentRequirementRepository).saveAll(List.of(requirement));
        verify(equipmentRequirementRepository).flush();
        verify(userRepository).saveAll(List.of(user));
        verify(userRepository).flush();
        verify(musicianRepository).deleteAllInBatch();
    }

    @Test
    void deleteMusicianThrowsWhenNotFound() {
        when(musicianRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> musicianService.deleteMusician(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("nicht gefunden");
    }
}
