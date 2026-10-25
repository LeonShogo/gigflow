package de.gigflow.backend.setlist;

import de.gigflow.backend.event.EventOwnershipService;
import de.gigflow.backend.user.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    private final EventOwnershipService ownershipService;

    public PieceController(PieceService pieceService, EventOwnershipService ownershipService) {
        this.pieceService = pieceService;
        this.ownershipService = ownershipService;
    }

    @GetMapping
    public List<PieceResponse> getAllPieces(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return pieceService.findAllPieces().stream()
                .filter(piece -> ownershipService.canViewPiece(currentUser, piece.getId()))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PieceResponse> getPieceById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canViewPiece(currentUser, id)) {
            return ResponseEntity.notFound().build();
        }
        Optional<PieceResponse> piece = pieceService.findPieceById(id);
        return piece.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PieceResponse> createPiece(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody PieceRequest request) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        PieceResponse created = pieceService.createPiece(request, currentUser.userId());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PieceResponse> updatePiece(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody PieceRequest request) {
        if (!ownershipService.canManagePiece(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            PieceResponse updated = pieceService.updatePiece(id, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePiece(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canManagePiece(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        pieceService.deletePiece(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/sheets")
    public ResponseEntity<List<PieceSheetResponse>> getSheets(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canViewPiece(currentUser, id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            return ResponseEntity.ok(pieceService.findSheets(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/sheets")
    public ResponseEntity<?> uploadSheets(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam("files") List<MultipartFile> files) {
        if (!ownershipService.canManagePiece(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
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
    public ResponseEntity<?> uploadDemoAudio(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam("file") MultipartFile file) {
        if (!ownershipService.canManagePiece(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
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

    @GetMapping("/{id}/demo-audios")
    public ResponseEntity<List<PieceDemoAudioResponse>> getDemoAudios(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canViewPiece(currentUser, id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            return ResponseEntity.ok(pieceService.findDemoAudios(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/demo-audios")
    public ResponseEntity<?> uploadDemoAudios(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam("files") List<MultipartFile> files) {
        if (!ownershipService.canManagePiece(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(pieceService.addDemoAudios(id, files));
        } catch (IllegalArgumentException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Stück nicht gefunden")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @GetMapping("/{id}/demo-audios/{audioId}")
    public ResponseEntity<Resource> downloadDemoAudio(
            @PathVariable Long id,
            @PathVariable Long audioId,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canViewDemoAudio(currentUser, audioId)) {
            return ResponseEntity.notFound().build();
        }
        Optional<PieceService.DemoAudioFile> demoAudio = pieceService.loadDemoAudio(id, audioId);
        if (demoAudio.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        PieceService.DemoAudioFile file = demoAudio.get();
        String encodedName = URLEncoder.encode(file.originalName(), StandardCharsets.UTF_8)
                .replace("+", "%20");
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("audio/mpeg"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + encodedName);
        return ResponseEntity.ok()
                .headers(headers)
                .contentLength(file.path().toFile().length())
                .body(new FileSystemResource(file.path()));
    }

    @DeleteMapping("/{id}/demo-audios/{audioId}")
    public ResponseEntity<Void> deleteDemoAudio(
            @PathVariable Long id,
            @PathVariable Long audioId,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canManageDemoAudio(currentUser, audioId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            pieceService.deleteDemoAudio(id, audioId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/links")
    public ResponseEntity<List<PieceLinkResponse>> getLinks(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canViewPiece(currentUser, id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            return ResponseEntity.ok(pieceService.findLinks(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/links")
    public ResponseEntity<?> createLink(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody PieceLinkRequest request) {
        if (!ownershipService.canManagePiece(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(pieceService.addLink(id, request));
        } catch (IllegalArgumentException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Stück nicht gefunden")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/links/{linkId}")
    public ResponseEntity<?> updateLink(
            @PathVariable Long id,
            @PathVariable Long linkId,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody PieceLinkRequest request) {
        if (!ownershipService.canManageLink(currentUser, linkId)
                || !ownershipService.canManagePiece(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.ok(pieceService.updateLink(id, linkId, request));
        } catch (IllegalArgumentException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Link nicht gefunden")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}/links/{linkId}")
    public ResponseEntity<Void> deleteLink(
            @PathVariable Long id,
            @PathVariable Long linkId,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canManageLink(currentUser, linkId)
                || !ownershipService.canManagePiece(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            pieceService.deleteLink(id, linkId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/demo-audio")
    public ResponseEntity<Resource> downloadDemoAudio(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canViewPiece(currentUser, id)) {
            return ResponseEntity.notFound().build();
        }
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
    public ResponseEntity<Void> deleteDemoAudio(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canManagePiece(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            pieceService.removeDemoAudio(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/youtube")
    public ResponseEntity<?> updateYoutubeUrl(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestBody PieceYoutubeRequest request) {
        if (!ownershipService.canManagePiece(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
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
