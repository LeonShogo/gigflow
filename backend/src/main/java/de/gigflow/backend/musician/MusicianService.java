package de.gigflow.backend.musician;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class MusicianService {

    private final MusicianRepository musicianRepository;

    public MusicianService(MusicianRepository musicianRepository) {
        this.musicianRepository = musicianRepository;
    }

    public MusicianResponse createMusician(MusicianRequest request) {
        Musician musician = new Musician();
        musician.setFirstName(request.getFirstName());
        musician.setLastName(request.getLastName());
        musician.setInstrument(request.getInstrument());
        musician.setEmail(request.getEmail());
        return MusicianResponse.from(musicianRepository.save(musician));
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
        return MusicianResponse.from(musicianRepository.save(existing));
    }

    public void deleteMusician(Long id) {
        musicianRepository.deleteById(id);
    }
}
