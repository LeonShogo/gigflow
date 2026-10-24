package de.gigflow.backend.setlist;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PieceDemoAudioRepository extends JpaRepository<PieceDemoAudio, Long> {

    List<PieceDemoAudio> findByPieceIdOrderBySortOrderAscIdAsc(Long pieceId);

    List<PieceDemoAudio> findByPieceIdInOrderByPieceIdAscSortOrderAscIdAsc(Collection<Long> pieceIds);
}
