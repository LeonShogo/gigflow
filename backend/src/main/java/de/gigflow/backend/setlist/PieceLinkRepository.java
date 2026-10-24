package de.gigflow.backend.setlist;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PieceLinkRepository extends JpaRepository<PieceLink, Long> {

    List<PieceLink> findByPieceIdOrderBySortOrderAscIdAsc(Long pieceId);

    List<PieceLink> findByPieceIdInOrderByPieceIdAscSortOrderAscIdAsc(Collection<Long> pieceIds);
}
