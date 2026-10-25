package de.gigflow.backend.setlist;

import de.gigflow.backend.event.EventOwnershipService;
import de.gigflow.backend.user.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@RestController
@RequestMapping("/api/piece-sheets")
public class PieceSheetController {

    private final PieceService pieceService;
    private final EventOwnershipService ownershipService;

    public PieceSheetController(PieceService pieceService, EventOwnershipService ownershipService) {
        this.pieceService = pieceService;
        this.ownershipService = ownershipService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> downloadSheet(
            @PathVariable Long id,
            @RequestParam(name = "download", defaultValue = "false") boolean download) {
        Optional<PieceService.SheetFile> sheet = pieceService.loadSheet(id);
        if (sheet.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        PieceService.SheetFile file = sheet.get();
        String encodedName = URLEncoder.encode(file.originalName(), StandardCharsets.UTF_8)
                .replace("+", "%20");
        String disposition = (download ? "attachment" : "inline") + "; filename*=UTF-8''" + encodedName;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.set(HttpHeaders.CONTENT_DISPOSITION, disposition);
        return ResponseEntity.ok()
                .headers(headers)
                .contentLength(file.path().toFile().length())
                .body(new FileSystemResource(file.path()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> renameSheet(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody PieceSheetRenameRequest request) {
        if (!ownershipService.canManageSheet(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.ok(pieceService.renameSheet(id, request.getLabel()));
        } catch (IllegalArgumentException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Notenblatt nicht gefunden")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSheet(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser currentUser) {
        if (!ownershipService.canManageSheet(currentUser, id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        pieceService.deleteSheet(id);
        return ResponseEntity.noContent().build();
    }
}
