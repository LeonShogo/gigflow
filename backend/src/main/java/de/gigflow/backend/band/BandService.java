package de.gigflow.backend.band;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class BandService {

    private final BandRepository bandRepository;
    private final BandMembershipRepository membershipRepository;

    public BandService(BandRepository bandRepository, BandMembershipRepository membershipRepository) {
        this.bandRepository = bandRepository;
        this.membershipRepository = membershipRepository;
    }

    public BandResponse createBand(BandRequest request) {
        Band band = new Band();
        band.setName(request.getName());
        band.setGenre(request.getGenre());
        return BandResponse.from(bandRepository.save(band));
    }

    public Optional<BandResponse> findBandById(Long id) {
        return bandRepository.findById(id).map(BandResponse::from);
    }

    public List<BandResponse> findAllBands() {
        return bandRepository.findAll().stream().map(BandResponse::from).toList();
    }

    public BandResponse updateBand(Long id, BandRequest request) {
        Band existing = bandRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Band nicht gefunden: " + id));
        existing.setName(request.getName());
        existing.setGenre(request.getGenre());
        return BandResponse.from(bandRepository.save(existing));
    }

    @Transactional
    public void deleteBand(Long id) {
        membershipRepository.deleteAll(membershipRepository.findByBandId(id));
        bandRepository.deleteById(id);
    }
}
