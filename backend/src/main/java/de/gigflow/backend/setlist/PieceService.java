package de.gigflow.backend.setlist;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class PieceService {

    public record SheetPdfFile(Path path, String originalName) {
    }

    private final PieceRepository pieceRepository;
    private final Path uploadDir;

    public PieceService(
            PieceRepository pieceRepository,
            @Value("${app.sheet-pdf-dir:./uploads/sheet-music}") String uploadDir) {
        this.pieceRepository = pieceRepository;
        this.uploadDir = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public PieceResponse createPiece(PieceRequest request) {
        Piece piece = new Piece();
        piece.setTitle(request.getTitle());
        return PieceResponse.from(pieceRepository.save(piece));
    }

    public Optional<PieceResponse> findPieceById(Long id) {
        return pieceRepository.findById(id).map(PieceResponse::from);
    }

    public List<PieceResponse> findAllPieces() {
        return pieceRepository.findAll().stream().map(PieceResponse::from).toList();
    }

    public PieceResponse updatePiece(Long id, PieceRequest request) {
        Piece existing = pieceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Stück nicht gefunden: " + id));
        existing.setTitle(request.getTitle());
        return PieceResponse.from(pieceRepository.save(existing));
    }

    public void deletePiece(Long id) {
        pieceRepository.findById(id).ifPresent(piece -> {
            deleteStoredPdf(piece);
            pieceRepository.deleteById(id);
        });
    }

    public PieceResponse saveSheetPdf(Long id, MultipartFile file) {
        Piece piece = pieceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Stück nicht gefunden: " + id));
        validatePdf(file);
        try {
            Files.createDirectories(uploadDir);
            String storedName = "piece-" + id + "-" + UUID.randomUUID() + ".pdf";
            file.transferTo(uploadDir.resolve(storedName));
            deleteStoredPdf(piece);
            piece.setSheetPdfPath(storedName);
            piece.setSheetPdfOriginalName(sanitizeOriginalName(file.getOriginalFilename()));
            return PieceResponse.from(pieceRepository.save(piece));
        } catch (IOException e) {
            throw new IllegalStateException("PDF konnte nicht gespeichert werden", e);
        }
    }

    public Optional<SheetPdfFile> loadSheetPdf(Long id) {
        return pieceRepository.findById(id).flatMap(piece -> {
            if (piece.getSheetPdfPath() == null) {
                return Optional.empty();
            }
            Path path = resolveStoredPath(piece.getSheetPdfPath());
            if (!Files.isRegularFile(path)) {
                return Optional.empty();
            }
            return Optional.of(new SheetPdfFile(path, piece.getSheetPdfOriginalName()));
        });
    }

    public void removeSheetPdf(Long id) {
        Piece piece = pieceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Stück nicht gefunden: " + id));
        if (deleteStoredPdf(piece)) {
            piece.setSheetPdfPath(null);
            piece.setSheetPdfOriginalName(null);
            pieceRepository.save(piece);
        }
    }

    private boolean deleteStoredPdf(Piece piece) {
        if (piece.getSheetPdfPath() == null) {
            return false;
        }
        try {
            return Files.deleteIfExists(resolveStoredPath(piece.getSheetPdfPath()));
        } catch (IOException e) {
            return false;
        }
    }

    private Path resolveStoredPath(String storedName) {
        return uploadDir.resolve(storedName).normalize();
    }

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Keine Datei hochgeladen");
        }
        String ext = Optional.ofNullable(file.getOriginalFilename())
                .map(name -> name.substring(name.lastIndexOf('.')))
                .orElse("");
        if (!".pdf".equalsIgnoreCase(ext) && !"application/pdf".equalsIgnoreCase(file.getContentType())) {
            throw new IllegalArgumentException("Nur PDF-Dateien sind erlaubt");
        }
    }

    private String sanitizeOriginalName(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            return "noten.pdf";
        }
        return originalName.toLowerCase(Locale.ROOT).endsWith(".pdf")
                ? originalName
                : originalName + ".pdf";
    }
}