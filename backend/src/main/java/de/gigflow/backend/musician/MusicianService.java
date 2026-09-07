package de.gigflow.backend.musician;

import de.gigflow.backend.band.BandMembershipRepository;
import de.gigflow.backend.equipment.EquipmentRequirementRepository;
import de.gigflow.backend.event.EventParticipationRepository;
import de.gigflow.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class MusicianService {

    private final MusicianRepository musicianRepository;
    private final EventParticipationRepository participationRepository;
    private final BandMembershipRepository bandMembershipRepository;
    private final EquipmentRequirementRepository equipmentRequirementRepository;
    private final UserRepository userRepository;

    public MusicianService(
            MusicianRepository musicianRepository,
            EventParticipationRepository participationRepository,
            BandMembershipRepository bandMembershipRepository,
            EquipmentRequirementRepository equipmentRequirementRepository,
            UserRepository userRepository) {
        this.musicianRepository = musicianRepository;
        this.participationRepository = participationRepository;
        this.bandMembershipRepository = bandMembershipRepository;
        this.equipmentRequirementRepository = equipmentRequirementRepository;
        this.userRepository = userRepository;
    }

    public MusicianResponse createMusician(MusicianRequest request) {
        Musician musician = new Musician();
        musician.setFirstName(request.getFirstName());
        musician.setLastName(request.getLastName());
        musician.setInstrument(request.getInstrument());
        musician.setEmail(request.getEmail());
        musician.setEmailPublic(request.isEmailPublic());
        return MusicianResponse.from(musicianRepository.save(musician));
    }

    public Musician createMusicianEntity(String firstName, String lastName, String instrument) {
        Musician musician = new Musician();
        musician.setFirstName(firstName);
        musician.setLastName(lastName);
        musician.setInstrument(instrument);
        return musicianRepository.save(musician);
    }

    public Optional<MusicianResponse> findMusicianById(Long id) {
        return musicianRepository.findById(id).map(MusicianResponse::from);
    }

    public List<MusicianResponse> findAllMusicians() {
        return musicianRepository.findAll().stream().map(MusicianResponse::from).toList();
    }

    public MusicianResponse updateMusician(Long id, MusicianRequest request) {
        Musician existing = musicianRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Musician nicht gefunden: " + id));
        existing.setFirstName(request.getFirstName());
        existing.setLastName(request.getLastName());
        existing.setInstrument(request.getInstrument());
        existing.setEmail(request.getEmail());
        existing.setEmailPublic(request.isEmailPublic());
        return MusicianResponse.from(musicianRepository.save(existing));
    }

    /**
     * Deletes a musician, but only if no dependent records reference them.
     * Deleting a musician who still has participations, band memberships,
     * responsible equipment or a linked user account would create orphans,
     * so those cases are rejected with a clear German error message.
     */
    @Transactional
    public void deleteMusician(Long id) {
        Musician musician = musicianRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Musiker:in nicht gefunden: " + id));

        if (!participationRepository.findByMusicianId(id).isEmpty()) {
            throw new IllegalArgumentException(
                    "„" + musician.getFirstName() + " " + musician.getLastName()
                            + "“ kann nicht gelöscht werden: noch zu Gigs/Proben zugeordnet.");
        }
        if (!bandMembershipRepository.findByMusicianId(id).isEmpty()) {
            throw new IllegalArgumentException(
                    "„" + musician.getFirstName() + " " + musician.getLastName()
                            + "“ kann nicht gelöscht werden: noch einer Band zugeordnet.");
        }
        if (!equipmentRequirementRepository.findByResponsibleMusicianId(id).isEmpty()) {
            throw new IllegalArgumentException(
                    "„" + musician.getFirstName() + " " + musician.getLastName()
                            + "“ kann nicht gelöscht werden: noch als Verantwortliche:r für Equipment hinterlegt.");
        }
        if (!userRepository.findByMusicianId(id).isEmpty()) {
            throw new IllegalArgumentException(
                    "„" + musician.getFirstName() + " " + musician.getLastName()
                            + "“ kann nicht gelöscht werden: es besteht noch ein verknüpftes Benutzerkonto.");
        }

        musicianRepository.delete(musician);
    }
}
