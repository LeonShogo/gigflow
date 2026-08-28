package de.gigflow.backend.musician;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/musicians")
public class MusicianController {

    private final MusicianService musicianService;

    public MusicianController(MusicianService musicianService) {
        this.musicianService = musicianService;
    }

    @GetMapping
    public List<MusicianResponse> getAllMusicians() {
        return musicianService.findAllMusicians();
    }

    @GetMapping("/{id}")
    public ResponseEntity<MusicianResponse> getMusicianById(@PathVariable Long id) {
        Optional<MusicianResponse> musician = musicianService.findMusicianById(id);
        return musician.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<MusicianResponse> createMusician(@Valid @RequestBody MusicianRequest request) {
        MusicianResponse created = musicianService.createMusician(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MusicianResponse> updateMusician(@PathVariable Long id, @Valid @RequestBody MusicianRequest request) {
        try {
            MusicianResponse updated = musicianService.updateMusician(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMusician(@PathVariable Long id) {
        musicianService.deleteMusician(id);
        return ResponseEntity.noContent().build();
    }
}
