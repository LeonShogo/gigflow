package de.gigflow.backend.setlist;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PieceSheetRepository extends JpaRepository<PieceSheet, Long> {

    List<PieceSheet> findByPieceIdOrderBySortOrderAscIdAsc(Long pieceId);

    List<PieceSheet> findByPieceIdInOrderByPieceIdAscSortOrderAscIdAsc(Collection<Long> pieceIds);
}
