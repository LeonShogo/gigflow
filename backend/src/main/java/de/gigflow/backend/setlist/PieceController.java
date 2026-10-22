package de.gigflow.backend.setlist;

import jakarta.validation.Valid;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/pieces")
public class PieceController {

    private final PieceService pieceService;

    public PieceController(PieceService pieceService) {
        this.pieceService = pieceService;
    }

    @GetMapping
    public List<PieceResponse> getAllPieces() {
        return pieceService.findAllPieces();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PieceResponse> getPieceById(@PathVariable Long id) {
        Optional<PieceResponse> piece = pieceService.findPieceById(id);
        return piece.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PieceResponse> createPiece(@Valid @RequestBody PieceRequest request) {
        PieceResponse created = pieceService.createPiece(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PieceResponse> updatePiece(@PathVariable Long id, @Valid @RequestBody PieceRequest request) {
        try {
            PieceResponse updated = pieceService.updatePiece(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePiece(@PathVariable Long id) {
        pieceService.deletePiece(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/sheets")
    public ResponseEntity<List<PieceSheetResponse>> getSheets(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(pieceService.findSheets(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/sheets")
    public ResponseEntity<?> uploadSheets(
            @PathVariable Long id,
            @RequestParam("files") List<MultipartFile> files) {
        try {
            List<PieceSheetResponse> created = pieceService.addSheets(id, files);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Stück nicht gefunden")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/demo-audio")
    public ResponseEntity<?> uploadDemoAudio(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            PieceResponse updated = pieceService.saveDemoAudio(id, file);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Stück nicht gefunden")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping("/{id}/demo-audio")
    public ResponseEntity<Resource> downloadDemoAudio(@PathVariable Long id) {
        Optional<PieceService.DemoAudioFile> demoAudio = pieceService.loadDemoAudio(id);
        if (demoAudio.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        PieceService.DemoAudioFile file = demoAudio.get();
        String encodedName = URLEncoder.encode(file.originalName(), StandardCharsets.UTF_8)
                .replace("+", "%20");
        String disposition = "inline; filename*=UTF-8''" + encodedName;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("audio/mpeg"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, disposition);
        return ResponseEntity.ok()
                .headers(headers)
                .contentLength(file.path().toFile().length())
                .body(new FileSystemResource(file.path()));
    }

    @DeleteMapping("/{id}/demo-audio")
    public ResponseEntity<Void> deleteDemoAudio(@PathVariable Long id) {
        try {
            pieceService.removeDemoAudio(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/youtube")
    public ResponseEntity<?> updateYoutubeUrl(@PathVariable Long id, @RequestBody PieceYoutubeRequest request) {
        try {
            PieceResponse updated = pieceService.setYoutubeUrl(id, request.getYoutubeUrl());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Stück nicht gefunden")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
