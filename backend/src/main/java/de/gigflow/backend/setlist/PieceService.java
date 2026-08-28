package de.gigflow.backend.setlist;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PieceService {

    private final PieceRepository pieceRepository;

    public PieceService(PieceRepository pieceRepository) {
        this.pieceRepository = pieceRepository;
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
        pieceRepository.deleteById(id);
    }
}
