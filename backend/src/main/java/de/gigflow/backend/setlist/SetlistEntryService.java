package de.gigflow.backend.setlist;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SetlistEntryService {

    private final SetlistEntryRepository entryRepository;
    private final SetlistRepository setlistRepository;
    private final PieceRepository pieceRepository;
    private final PieceSheetRepository sheetRepository;

    public SetlistEntryService(SetlistEntryRepository entryRepository,
                               SetlistRepository setlistRepository,
                               PieceRepository pieceRepository,
                               PieceSheetRepository sheetRepository) {
        this.entryRepository = entryRepository;
        this.setlistRepository = setlistRepository;
        this.pieceRepository = pieceRepository;
        this.sheetRepository = sheetRepository;
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
        return toResponse(entryRepository.save(entry));
    }

    public Optional<SetlistEntryResponse> findEntryById(Long id) {
        return entryRepository.findById(id).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<SetlistEntryResponse> findEntriesBySetlist(Long setlistId) {
        return toResponses(entryRepository.findBySetlistIdOrderByPositionAsc(setlistId));
    }

    @Transactional(readOnly = true)
    public List<SetlistEntryResponse> findAllEntries() {
        return toResponses(entryRepository.findAll());
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
        return toResponse(entryRepository.save(existing));
    }

    public void deleteEntry(Long id) {
        entryRepository.deleteById(id);
    }

    private SetlistEntryResponse toResponse(SetlistEntry entry) {
        Long pieceId = entry.getPiece() != null ? entry.getPiece().getId() : null;
        List<PieceSheet> sheets = pieceId == null
                ? List.of()
                : sheetRepository.findByPieceIdOrderBySortOrderAscIdAsc(pieceId);
        return SetlistEntryResponse.from(entry, sheets);
    }

    private List<SetlistEntryResponse> toResponses(List<SetlistEntry> entries) {
        Map<Long, List<PieceSheet>> sheetsByPiece = sheetsByPiece(entries);
        return entries.stream()
                .map(entry -> SetlistEntryResponse.from(entry, sheetsFor(sheetsByPiece, entry)))
                .toList();
    }

    private Map<Long, List<PieceSheet>> sheetsByPiece(List<SetlistEntry> entries) {
        List<Long> pieceIds = entries.stream()
                .map(SetlistEntry::getPiece)
                .filter(piece -> piece != null)
                .map(Piece::getId)
                .distinct()
                .toList();
        if (pieceIds.isEmpty()) {
            return Map.of();
        }
        return sheetRepository.findByPieceIdInOrderByPieceIdAscSortOrderAscIdAsc(pieceIds).stream()
                .collect(Collectors.groupingBy(PieceSheet::getPieceId));
    }

    private List<PieceSheet> sheetsFor(Map<Long, List<PieceSheet>> sheetsByPiece, SetlistEntry entry) {
        if (entry.getPiece() == null) {
            return List.of();
        }
        Collection<PieceSheet> sheets = sheetsByPiece.get(entry.getPiece().getId());
        return sheets == null ? List.of() : List.copyOf(sheets);
    }
}
