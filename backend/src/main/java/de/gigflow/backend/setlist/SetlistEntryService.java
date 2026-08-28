package de.gigflow.backend.setlist;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SetlistEntryService {

    private final SetlistEntryRepository entryRepository;
    private final SetlistRepository setlistRepository;
    private final PieceRepository pieceRepository;

    public SetlistEntryService(SetlistEntryRepository entryRepository,
                               SetlistRepository setlistRepository,
                               PieceRepository pieceRepository) {
        this.entryRepository = entryRepository;
        this.setlistRepository = setlistRepository;
        this.pieceRepository = pieceRepository;
    }

    public SetlistEntryResponse createEntry(SetlistEntryRequest request) {
        Setlist setlist = setlistRepository.findById(request.getSetlistId())
                .orElseThrow(() -> new IllegalArgumentException("Setlist nicht gefunden: " + request.getSetlistId()));
        Piece piece = pieceRepository.findById(request.getPieceId())
                .orElseThrow(() -> new IllegalArgumentException("Stück nicht gefunden: " + request.getPieceId()));

        SetlistEntry entry = new SetlistEntry();
        entry.setSetlist(setlist);
        entry.setPiece(piece);
        entry.setPosition(request.getPosition());
        return SetlistEntryResponse.from(entryRepository.save(entry));
    }

    public Optional<SetlistEntryResponse> findEntryById(Long id) {
        return entryRepository.findById(id).map(SetlistEntryResponse::from);
    }

    public List<SetlistEntryResponse> findAllEntries() {
        return entryRepository.findAll().stream().map(SetlistEntryResponse::from).toList();
    }

    public SetlistEntryResponse updateEntry(Long id, SetlistEntryRequest request) {
        SetlistEntry existing = entryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Eintrag nicht gefunden: " + id));
        Setlist setlist = setlistRepository.findById(request.getSetlistId())
                .orElseThrow(() -> new IllegalArgumentException("Setlist nicht gefunden: " + request.getSetlistId()));
        Piece piece = pieceRepository.findById(request.getPieceId())
                .orElseThrow(() -> new IllegalArgumentException("Stück nicht gefunden: " + request.getPieceId()));

        existing.setSetlist(setlist);
        existing.setPiece(piece);
        existing.setPosition(request.getPosition());
        return SetlistEntryResponse.from(entryRepository.save(existing));
    }

    public void deleteEntry(Long id) {
        entryRepository.deleteById(id);
    }
}
