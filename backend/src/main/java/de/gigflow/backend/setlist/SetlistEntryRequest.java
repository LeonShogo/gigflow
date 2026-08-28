package de.gigflow.backend.setlist;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public class SetlistEntryRequest {

    @NotNull
    private Long setlistId;

    @NotNull
    private Long pieceId;

    @PositiveOrZero
    private int position;

    public Long getSetlistId() {
        return setlistId;
    }

    public void setSetlistId(Long setlistId) {
        this.setlistId = setlistId;
    }

    public Long getPieceId() {
        return pieceId;
    }

    public void setPieceId(Long pieceId) {
        this.pieceId = pieceId;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }
}
