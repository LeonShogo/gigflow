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
    private final PieceDemoAudioRepository demoAudioRepository;
    private final PieceLinkRepository linkRepository;

    public SetlistEntryService(SetlistEntryRepository entryRepository,
                               SetlistRepository setlistRepository,
                               PieceRepository pieceRepository,
                               PieceSheetRepository sheetRepository,
                               PieceDemoAudioRepository demoAudioRepository,
                               PieceLinkRepository linkRepository) {
        this.entryRepository = entryRepository;
        this.setlistRepository = setlistRepository;
        this.pieceRepository = pieceRepository;
        this.sheetRepository = sheetRepository;
        this.demoAudioRepository = demoAudioRepository;
        this.linkRepository = linkRepository;
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
        List<PieceDemoAudio> audios = pieceId == null
                ? List.of()
                : demoAudioRepository.findByPieceIdOrderBySortOrderAscIdAsc(pieceId);
        List<PieceLink> links = pieceId == null
                ? List.of()
                : linkRepository.findByPieceIdOrderBySortOrderAscIdAsc(pieceId);
        return SetlistEntryResponse.from(entry, sheets, audios, links);
    }

    private List<SetlistEntryResponse> toResponses(List<SetlistEntry> entries) {
        Map<Long, List<PieceSheet>> sheetsByPiece = sheetsByPiece(entries);
        Map<Long, List<PieceDemoAudio>> audiosByPiece = audiosByPiece(entries);
        Map<Long, List<PieceLink>> linksByPiece = linksByPiece(entries);
        return entries.stream()
                .map(entry -> SetlistEntryResponse.from(
                        entry,
                        sheetsFor(sheetsByPiece, entry),
                        audiosFor(audiosByPiece, entry),
                        linksFor(linksByPiece, entry)))
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

    private Map<Long, List<PieceDemoAudio>> audiosByPiece(List<SetlistEntry> entries) {
        List<Long> pieceIds = pieceIds(entries);
        if (pieceIds.isEmpty()) {
            return Map.of();
        }
        return demoAudioRepository.findByPieceIdInOrderByPieceIdAscSortOrderAscIdAsc(pieceIds).stream()
                .collect(Collectors.groupingBy(PieceDemoAudio::getPieceId));
    }

    private Map<Long, List<PieceLink>> linksByPiece(List<SetlistEntry> entries) {
        List<Long> pieceIds = pieceIds(entries);
        if (pieceIds.isEmpty()) {
            return Map.of();
        }
        return linkRepository.findByPieceIdInOrderByPieceIdAscSortOrderAscIdAsc(pieceIds).stream()
                .collect(Collectors.groupingBy(PieceLink::getPieceId));
    }

    private List<Long> pieceIds(List<SetlistEntry> entries) {
        return entries.stream()
                .map(SetlistEntry::getPiece)
                .filter(piece -> piece != null)
                .map(Piece::getId)
                .distinct()
                .toList();
    }

    private List<PieceDemoAudio> audiosFor(Map<Long, List<PieceDemoAudio>> audiosByPiece, SetlistEntry entry) {
        if (entry.getPiece() == null) {
            return List.of();
        }
        return audiosByPiece.getOrDefault(entry.getPiece().getId(), List.of());
    }

    private List<PieceLink> linksFor(Map<Long, List<PieceLink>> linksByPiece, SetlistEntry entry) {
        if (entry.getPiece() == null) {
            return List.of();
        }
        return linksByPiece.getOrDefault(entry.getPiece().getId(), List.of());
    }
}
