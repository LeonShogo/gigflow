package de.gigflow.backend.setlist;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class PieceService {

    private static final long MAX_AUDIO_SIZE_BYTES = 10L * 1024 * 1024;

    public record SheetFile(Path path, String originalName) {
    }

    public record DemoAudioFile(Path path, String originalName) {
    }

    private final PieceRepository pieceRepository;
    private final PieceSheetRepository sheetRepository;
    private final Path uploadDir;

    public PieceService(
            PieceRepository pieceRepository,
            PieceSheetRepository sheetRepository,
            @Value("${app.sheet-pdf-dir:./uploads/sheet-music}") String uploadDir) {
        this.pieceRepository = pieceRepository;
        this.sheetRepository = sheetRepository;
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
            deleteStoredAudio(piece);
            List<PieceSheet> sheets = sheetRepository.findByPieceIdOrderBySortOrderAscIdAsc(id);
            sheets.forEach(sheet -> deleteStoredFile(sheet.getStoredPath()));
            sheetRepository.deleteAll(sheets);
            pieceRepository.deleteById(id);
        });
    }

    public List<PieceSheetResponse> findSheets(Long pieceId) {
        requirePiece(pieceId);
        return sheetRepository.findByPieceIdOrderBySortOrderAscIdAsc(pieceId).stream()
                .map(PieceSheetResponse::from)
                .toList();
    }

    public List<PieceSheetResponse> addSheets(Long pieceId, List<MultipartFile> files) {
        requirePiece(pieceId);
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("Keine Datei hochgeladen");
        }
        files.forEach(this::validatePdf);

        List<PieceSheet> existing = sheetRepository.findByPieceIdOrderBySortOrderAscIdAsc(pieceId);
        int nextOrder = existing.stream().mapToInt(PieceSheet::getSortOrder).max().orElse(-1) + 1;
        List<PieceSheet> created = new ArrayList<>();
        List<Path> written = new ArrayList<>();
        try {
            Files.createDirectories(uploadDir);
            for (MultipartFile file : files) {
                String storedName = "piece-" + pieceId + "-sheet-" + UUID.randomUUID() + ".pdf";
                Path target = uploadDir.resolve(storedName);
                file.transferTo(target);
                written.add(target);

                PieceSheet sheet = new PieceSheet();
                sheet.setPieceId(pieceId);
                sheet.setLabel(labelFromFileName(file.getOriginalFilename()));
                sheet.setOriginalName(sanitizePdfName(file.getOriginalFilename()));
                sheet.setStoredPath(storedName);
                sheet.setSortOrder(nextOrder++);
                created.add(sheet);
            }
            return sheetRepository.saveAll(created).stream().map(PieceSheetResponse::from).toList();
        } catch (IOException e) {
            written.forEach(this::deleteFileQuietly);
            throw new IllegalStateException("PDF konnte nicht gespeichert werden", e);
        } catch (RuntimeException e) {
            written.forEach(this::deleteFileQuietly);
            throw e;
        }
    }

    public Optional<SheetFile> loadSheet(Long sheetId) {
        return sheetRepository.findById(sheetId).flatMap(sheet -> {
            Path path = resolveStoredPath(sheet.getStoredPath());
            if (!Files.isRegularFile(path)) {
                return Optional.empty();
            }
            return Optional.of(new SheetFile(path, sheet.getOriginalName()));
        });
    }

    public PieceSheetResponse renameSheet(Long sheetId, String label) {
        PieceSheet sheet = sheetRepository.findById(sheetId)
                .orElseThrow(() -> new IllegalArgumentException("Notenblatt nicht gefunden: " + sheetId));
        String trimmed = label == null ? "" : label.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Bezeichnung darf nicht leer sein");
        }
        if (trimmed.length() > 120) {
            throw new IllegalArgumentException("Bezeichnung ist zu lang (max. 120 Zeichen)");
        }
        sheet.setLabel(trimmed);
        return PieceSheetResponse.from(sheetRepository.save(sheet));
    }

    public void deleteSheet(Long sheetId) {
        sheetRepository.findById(sheetId).ifPresent(sheet -> {
            deleteStoredFile(sheet.getStoredPath());
            sheetRepository.delete(sheet);
        });
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

    private void requirePiece(Long pieceId) {
        if (!pieceRepository.existsById(pieceId)) {
            throw new IllegalArgumentException("Stück nicht gefunden: " + pieceId);
        }
    }

    private void deleteStoredFile(String storedName) {
        if (storedName == null) {
            return;
        }
        deleteFileQuietly(resolveStoredPath(storedName));
    }

    private void deleteFileQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
            // A stale file must not block deleting the database record.
        }
    }

    private Path resolveStoredPath(String storedName) {
        return uploadDir.resolve(storedName).normalize();
    }

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Keine Datei hochgeladen");
        }
        String name = file.getOriginalFilename();
        boolean pdfName = name != null && name.toLowerCase(Locale.ROOT).endsWith(".pdf");
        if (!pdfName && !"application/pdf".equalsIgnoreCase(file.getContentType())) {
            throw new IllegalArgumentException("Nur PDF-Dateien sind erlaubt");
        }
    }

    private String sanitizePdfName(String originalName) {
        if (originalName == null || originalName.isBlank()) {
            return "noten.pdf";
        }
        String name = originalName.trim();
        return name.toLowerCase(Locale.ROOT).endsWith(".pdf") ? name : name + ".pdf";
    }

    private String labelFromFileName(String originalName) {
        String name = sanitizePdfName(originalName).trim();
        String label = name.toLowerCase(Locale.ROOT).endsWith(".pdf")
                ? name.substring(0, name.length() - 4).trim()
                : name;
        if (label.isEmpty()) {
            return "Noten";
        }
        return label.length() > 120 ? label.substring(0, 120) : label;
    }

    private void validateMp3(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Keine Datei hochgeladen");
        }
        String name = file.getOriginalFilename();
        boolean mp3Name = name != null && name.toLowerCase(Locale.ROOT).endsWith(".mp3");
        if (!mp3Name && !"audio/mpeg".equalsIgnoreCase(file.getContentType())) {
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
        String name = originalName.trim();
        return name.toLowerCase(Locale.ROOT).endsWith(".mp3") ? name : name + ".mp3";
    }
}