package de.gigflow.backend.band;

import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.musician.MusicianRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BandMembershipService {

    private final BandMembershipRepository membershipRepository;
    private final BandRepository bandRepository;
    private final MusicianRepository musicianRepository;

    public BandMembershipService(BandMembershipRepository membershipRepository,
                                 BandRepository bandRepository,
                                 MusicianRepository musicianRepository) {
        this.membershipRepository = membershipRepository;
        this.bandRepository = bandRepository;
        this.musicianRepository = musicianRepository;
    }

    public BandMembershipResponse createMembership(BandMembershipRequest request) {
        Band band = bandRepository.findById(request.getBandId())
                .orElseThrow(() -> new IllegalArgumentException("Band nicht gefunden: " + request.getBandId()));
        Musician musician = musicianRepository.findById(request.getMusicianId())
                .orElseThrow(() -> new IllegalArgumentException("Musiker:in nicht gefunden: " + request.getMusicianId()));

        if (membershipRepository.existsByBandIdAndMusicianId(band.getId(), musician.getId())) {
            throw new IllegalArgumentException(
                    "Musiker:in ist dieser Band bereits zugeordnet: " + musician.getId());
        }

        BandMembership membership = new BandMembership();
        membership.setBand(band);
        membership.setMusician(musician);
        return BandMembershipResponse.from(membershipRepository.save(membership));
    }

    public Optional<BandMembershipResponse> findMembershipById(Long id) {
        return membershipRepository.findById(id).map(BandMembershipResponse::from);
    }

    public List<BandMembershipResponse> findAllMemberships() {
        return membershipRepository.findAll().stream().map(BandMembershipResponse::from).toList();
    }

    public List<BandMembershipResponse> findMembershipsByBand(Long bandId) {
        return membershipRepository.findByBandId(bandId).stream()
                .map(BandMembershipResponse::from)
                .toList();
    }

    public BandMembershipResponse updateMembership(Long id, BandMembershipRequest request) {
        BandMembership existing = membershipRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Mitgliedschaft nicht gefunden: " + id));
        Band band = bandRepository.findById(request.getBandId())
                .orElseThrow(() -> new IllegalArgumentException("Band nicht gefunden: " + request.getBandId()));
        Musician musician = musicianRepository.findById(request.getMusicianId())
                .orElseThrow(() -> new IllegalArgumentException("Musiker:in nicht gefunden: " + request.getMusicianId()));

        existing.setBand(band);
        existing.setMusician(musician);
        return BandMembershipResponse.from(membershipRepository.save(existing));
    }

    public void deleteMembership(Long id) {
        membershipRepository.deleteById(id);
    }
}
