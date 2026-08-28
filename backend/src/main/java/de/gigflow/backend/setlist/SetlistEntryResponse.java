package de.gigflow.backend.setlist;

public class SetlistEntryResponse {

    private Long id;
    private Long setlistId;
    private Long pieceId;
    private int position;

    public static SetlistEntryResponse from(SetlistEntry entry) {
        SetlistEntryResponse response = new SetlistEntryResponse();
        response.setId(entry.getId());
        if (entry.getSetlist() != null) {
            response.setSetlistId(entry.getSetlist().getId());
        }
        if (entry.getPiece() != null) {
            response.setPieceId(entry.getPiece().getId());
        }
        response.setPosition(entry.getPosition());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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
