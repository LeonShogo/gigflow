package de.gigflow.backend.band;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BandService {

    private final BandRepository bandRepository;

    public BandService(BandRepository bandRepository) {
        this.bandRepository = bandRepository;
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

    public void deleteBand(Long id) {
        bandRepository.deleteById(id);
    }
}
