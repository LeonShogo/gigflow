package de.gigflow.backend.setlist;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class PieceService {

    private static final long MAX_AUDIO_SIZE_BYTES = 10L * 1024 * 1024;

    public record SheetPdfFile(Path path, String originalName) {
    }

    public record DemoAudioFile(Path path, String originalName) {
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
        piece.setYoutubeUrl(normalizeOptional(request.getYoutubeUrl()));
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
        existing.setYoutubeUrl(normalizeOptional(request.getYoutubeUrl()));
        return PieceResponse.from(pieceRepository.save(existing));
    }

    public void deletePiece(Long id) {
        pieceRepository.findById(id).ifPresent(piece -> {
            deleteStoredPdf(piece);
            deleteStoredAudio(piece);
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

    public PieceResponse saveDemoAudio(Long id, MultipartFile file) {
        Piece piece = pieceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Stück nicht gefunden: " + id));
        validateMp3(file);
        try {
            Files.createDirectories(uploadDir);
            String storedName = "piece-" + id + "-" + UUID.randomUUID() + ".mp3";
            file.transferTo(uploadDir.resolve(storedName));
            deleteStoredAudio(piece);
            piece.setDemoAudioPath(storedName);
            piece.setDemoAudioOriginalName(sanitizeAudioName(file.getOriginalFilename()));
            return PieceResponse.from(pieceRepository.save(piece));
        } catch (IOException e) {
            throw new IllegalStateException("Audio konnte nicht gespeichert werden", e);
        }
    }

    public Optional<DemoAudioFile> loadDemoAudio(Long id) {
        return pieceRepository.findById(id).flatMap(piece -> {
            if (piece.getDemoAudioPath() == null) {
                return Optional.empty();
            }
            Path path = resolveStoredPath(piece.getDemoAudioPath());
            if (!Files.isRegularFile(path)) {
                return Optional.empty();
            }
            return Optional.of(new DemoAudioFile(path, piece.getDemoAudioOriginalName()));
        });
    }

    public void removeDemoAudio(Long id) {
        Piece piece = pieceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Stück nicht gefunden: " + id));
        if (deleteStoredAudio(piece)) {
            piece.setDemoAudioPath(null);
            piece.setDemoAudioOriginalName(null);
            pieceRepository.save(piece);
        }
    }

    public PieceResponse setYoutubeUrl(Long id, String youtubeUrl) {
        Piece piece = pieceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Stück nicht gefunden: " + id));
        String normalized = normalizeOptional(youtubeUrl);
        validateYoutubeUrl(normalized);
        piece.setYoutubeUrl(normalized);
        return PieceResponse.from(pieceRepository.save(piece));
    }

    private boolean deleteStoredAudio(Piece piece) {
        if (piece.getDemoAudioPath() == null) {
            return false;
        }
        try {
            return Files.deleteIfExists(resolveStoredPath(piece.getDemoAudioPath()));
        } catch (IOException e) {
            return false;
        }
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validateYoutubeUrl(String url) {
        if (url == null) {
            return;
        }
        if (url.length() > 500) {
            throw new IllegalArgumentException("YouTube-Link ist zu lang");
        }
        try {
            URI uri = new URI(url);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
                throw new IllegalArgumentException("YouTube-Link muss mit http(s):// beginnen");
            }
            if (host == null) {
                throw new IllegalArgumentException("YouTube-Link ist ungültig");
            }
            String lowerHost = host.toLowerCase(Locale.ROOT);
            boolean isYoutube = "youtube.com".equals(lowerHost)
                    || "youtu.be".equals(lowerHost)
                    || lowerHost.endsWith(".youtube.com")
                    || lowerHost.endsWith(".youtu.be");
            if (!isYoutube) {
                throw new IllegalArgumentException("Nur YouTube-Links sind erlaubt");
            }
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("YouTube-Link ist ungültig");
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

    private void validateMp3(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Keine Datei hochgeladen");
        }
        String ext = Optional.ofNullable(file.getOriginalFilename())
                .map(name -> name.substring(name.lastIndexOf('.')))
                .orElse("");
        if (!".mp3".equalsIgnoreCase(ext) && !"audio/mpeg".equalsIgnoreCase(file.getContentType())) {
            throw new IllegalArgumentException("Nur MP3-Dateien sind erlaubt");
        }
        if (file.getSize() > MAX_AUDIO_SIZE_BYTES) {
            throw new IllegalArgumentException("Audio-Datei ist zu groß (max. 10 MB)");
        }
    }

    private String sanitizeAudioName(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            return "demoaudio.mp3";
        }
        return originalName.toLowerCase(Locale.ROOT).endsWith(".mp3")
                ? originalName
                : originalName + ".mp3";
    }
}