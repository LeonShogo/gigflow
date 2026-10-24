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
    private final PieceDemoAudioRepository demoAudioRepository;
    private final PieceLinkRepository linkRepository;
    private final Path uploadDir;

    public PieceService(
            PieceRepository pieceRepository,
            PieceSheetRepository sheetRepository,
            PieceDemoAudioRepository demoAudioRepository,
            PieceLinkRepository linkRepository,
            @Value("${app.sheet-pdf-dir:./uploads/sheet-music}") String uploadDir) {
        this.pieceRepository = pieceRepository;
        this.sheetRepository = sheetRepository;
        this.demoAudioRepository = demoAudioRepository;
        this.linkRepository = linkRepository;
        this.uploadDir = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public PieceResponse createPiece(PieceRequest request) {
        Piece piece = new Piece();
        piece.setTitle(request.getTitle());
        piece.setNotes(normalizeOptional(request.getNotes()));
        Piece saved = pieceRepository.save(piece);
        if (normalizeOptional(request.getYoutubeUrl()) != null) {
            setYoutubeUrl(saved.getId(), request.getYoutubeUrl());
        }
        return toResponse(saved);
    }

    public Optional<PieceResponse> findPieceById(Long id) {
        return pieceRepository.findById(id).map(this::toResponse);
    }

    public List<PieceResponse> findAllPieces() {
        return pieceRepository.findAll().stream().map(this::toResponse).toList();
    }

    public PieceResponse updatePiece(Long id, PieceRequest request) {
        Piece existing = pieceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Stück nicht gefunden: " + id));
        existing.setTitle(request.getTitle());
        existing.setNotes(normalizeOptional(request.getNotes()));
        Piece saved = pieceRepository.save(existing);
        if (normalizeOptional(request.getYoutubeUrl()) != null) {
            setYoutubeUrl(id, request.getYoutubeUrl());
        }
        return toResponse(saved);
    }

    public void deletePiece(Long id) {
        pieceRepository.findById(id).ifPresent(piece -> {
            List<PieceDemoAudio> audios = demoAudioRepository.findByPieceIdOrderBySortOrderAscIdAsc(id);
            audios.forEach(audio -> deleteStoredFile(audio.getStoredPath()));
            demoAudioRepository.deleteAll(audios);
            linkRepository.deleteAll(linkRepository.findByPieceIdOrderBySortOrderAscIdAsc(id));
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

    public List<PieceDemoAudioResponse> findDemoAudios(Long pieceId) {
        requirePiece(pieceId);
        return demoAudioRepository.findByPieceIdOrderBySortOrderAscIdAsc(pieceId).stream()
                .map(PieceDemoAudioResponse::from)
                .toList();
    }

    public List<PieceDemoAudioResponse> addDemoAudios(Long pieceId, List<MultipartFile> files) {
        requirePiece(pieceId);
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("Keine Datei hochgeladen");
        }
        files.forEach(this::validateMp3);
        List<PieceDemoAudio> existing = demoAudioRepository.findByPieceIdOrderBySortOrderAscIdAsc(pieceId);
        int nextOrder = existing.stream().mapToInt(PieceDemoAudio::getSortOrder).max().orElse(-1) + 1;
        List<PieceDemoAudio> created = new ArrayList<>();
        List<Path> written = new ArrayList<>();
        try {
            Files.createDirectories(uploadDir);
            for (MultipartFile file : files) {
                String originalName = sanitizeAudioName(file.getOriginalFilename());
                String storedName = "piece-" + pieceId + "-" + UUID.randomUUID() + ".mp3";
                Path target = uploadDir.resolve(storedName);
                file.transferTo(target);
                written.add(target);

                PieceDemoAudio audio = new PieceDemoAudio();
                audio.setPieceId(pieceId);
                audio.setLabel(labelFromAudioName(originalName));
                audio.setStoredPath(storedName);
                audio.setOriginalName(originalName);
                audio.setSortOrder(nextOrder++);
                created.add(audio);
            }
            return demoAudioRepository.saveAll(created).stream().map(PieceDemoAudioResponse::from).toList();
        } catch (IOException e) {
            written.forEach(this::deleteFileQuietly);
            throw new IllegalStateException("Audio konnte nicht gespeichert werden", e);
        } catch (RuntimeException e) {
            written.forEach(this::deleteFileQuietly);
            throw e;
        }
    }

    public PieceResponse saveDemoAudio(Long id, MultipartFile file) {
        addDemoAudios(id, List.of(file));
        return findPieceById(id).orElseThrow(() -> new IllegalArgumentException("Stück nicht gefunden: " + id));
    }

    public Optional<DemoAudioFile> loadDemoAudioById(Long audioId) {
        return demoAudioRepository.findById(audioId).flatMap(audio -> {
            Path path = resolveStoredPath(audio.getStoredPath());
            if (!Files.isRegularFile(path)) {
                return Optional.empty();
            }
            return Optional.of(new DemoAudioFile(path, audio.getOriginalName()));
        });
    }

    public Optional<DemoAudioFile> loadDemoAudio(Long pieceId, Long audioId) {
        return demoAudioRepository.findById(audioId)
                .filter(audio -> audio.getPieceId().equals(pieceId))
                .flatMap(audio -> loadDemoAudioById(audioId));
    }

    public Optional<DemoAudioFile> loadFirstDemoAudio(Long pieceId) {
        return demoAudioRepository.findByPieceIdOrderBySortOrderAscIdAsc(pieceId).stream()
                .findFirst()
                .flatMap(audio -> loadDemoAudioById(audio.getId()));
    }

    public Optional<DemoAudioFile> loadDemoAudio(Long pieceId) {
        return loadFirstDemoAudio(pieceId);
    }

    public void deleteDemoAudio(Long pieceId, Long audioId) {
        PieceDemoAudio audio = demoAudioRepository.findById(audioId)
                .filter(item -> item.getPieceId().equals(pieceId))
                .orElseThrow(() -> new IllegalArgumentException("Demo-Audio nicht gefunden: " + audioId));
        deleteStoredFile(audio.getStoredPath());
        demoAudioRepository.delete(audio);
    }

    public void removeDemoAudio(Long pieceId) {
        demoAudioRepository.findByPieceIdOrderBySortOrderAscIdAsc(pieceId).stream()
                .findFirst()
                .ifPresent(audio -> deleteDemoAudio(pieceId, audio.getId()));
    }

    public List<PieceLinkResponse> findLinks(Long pieceId) {
        requirePiece(pieceId);
        return linkRepository.findByPieceIdOrderBySortOrderAscIdAsc(pieceId).stream()
                .map(PieceLinkResponse::from)
                .toList();
    }

    public PieceLinkResponse addLink(Long pieceId, PieceLinkRequest request) {
        requirePiece(pieceId);
        validateLink(request.getLabel(), request.getUrl());
        List<PieceLink> existing = linkRepository.findByPieceIdOrderBySortOrderAscIdAsc(pieceId);
        PieceLink link = new PieceLink();
        link.setPieceId(pieceId);
        link.setLabel(request.getLabel().trim());
        link.setUrl(request.getUrl().trim());
        link.setSortOrder(existing.stream().mapToInt(PieceLink::getSortOrder).max().orElse(-1) + 1);
        return PieceLinkResponse.from(linkRepository.save(link));
    }

    public PieceLinkResponse updateLink(Long pieceId, Long linkId, PieceLinkRequest request) {
        PieceLink link = linkRepository.findById(linkId)
                .filter(item -> item.getPieceId().equals(pieceId))
                .orElseThrow(() -> new IllegalArgumentException("Link nicht gefunden: " + linkId));
        validateLink(request.getLabel(), request.getUrl());
        link.setLabel(request.getLabel().trim());
        link.setUrl(request.getUrl().trim());
        return PieceLinkResponse.from(linkRepository.save(link));
    }

    public void deleteLink(Long pieceId, Long linkId) {
        PieceLink link = linkRepository.findById(linkId)
                .filter(item -> item.getPieceId().equals(pieceId))
                .orElseThrow(() -> new IllegalArgumentException("Link nicht gefunden: " + linkId));
        linkRepository.delete(link);
    }

    public PieceResponse setYoutubeUrl(Long id, String youtubeUrl) {
        requirePiece(id);
        String normalized = normalizeOptional(youtubeUrl);
        validateYoutubeUrl(normalized);
        List<PieceLink> links = linkRepository.findByPieceIdOrderBySortOrderAscIdAsc(id);
        PieceLink legacyLink = links.stream()
                .filter(link -> "YouTube".equalsIgnoreCase(link.getLabel()))
                .findFirst()
                .orElse(null);
        if (normalized == null) {
            if (legacyLink != null) {
                linkRepository.delete(legacyLink);
            }
        } else if (legacyLink != null) {
            legacyLink.setUrl(normalized);
            linkRepository.save(legacyLink);
        } else {
            PieceLinkRequest request = new PieceLinkRequest();
            request.setLabel("YouTube");
            request.setUrl(normalized);
            addLink(id, request);
        }
        return findPieceById(id).orElseThrow(() -> new IllegalArgumentException("Stück nicht gefunden: " + id));
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

    private void validateLink(String label, String url) {
        if (label == null || label.isBlank() || label.trim().length() > 120) {
            throw new IllegalArgumentException("Link-Bezeichnung muss zwischen 1 und 120 Zeichen lang sein");
        }
        if (url == null || url.isBlank() || url.trim().length() > 1000) {
            throw new IllegalArgumentException("Link-Adresse muss zwischen 1 und 1000 Zeichen lang sein");
        }
        try {
            URI uri = new URI(url.trim());
            String scheme = uri.getScheme();
            if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))
                    || uri.getHost() == null) {
                throw new IllegalArgumentException("Link muss eine gültige http(s)-Adresse sein");
            }
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("Link-Adresse ist ungültig");
        }
    }

    private void requirePiece(Long pieceId) {
        if (!pieceRepository.existsById(pieceId)) {
            throw new IllegalArgumentException("Stück nicht gefunden: " + pieceId);
        }
    }

    private PieceResponse toResponse(Piece piece) {
        List<PieceDemoAudio> audios = demoAudioRepository.findByPieceIdOrderBySortOrderAscIdAsc(piece.getId());
        List<PieceLink> links = linkRepository.findByPieceIdOrderBySortOrderAscIdAsc(piece.getId());
        return PieceResponse.from(piece, audios, links);
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

    private String labelFromAudioName(String originalName) {
        String label = originalName.toLowerCase(Locale.ROOT).endsWith(".mp3")
                ? originalName.substring(0, originalName.length() - 4).trim()
                : originalName.trim();
        if (label.isEmpty()) {
            return "Demo";
        }
        return label.length() > 120 ? label.substring(0, 120) : label;
    }
}
