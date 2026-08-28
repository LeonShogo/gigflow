package de.gigflow.backend.setlist;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
