package de.gigflow.backend.setlist;

public class PieceDemoAudioResponse {

    private Long id;
    private Long pieceId;
    private String label;
    private String originalName;
    private int sortOrder;

    public static PieceDemoAudioResponse from(PieceDemoAudio audio) {
        PieceDemoAudioResponse response = new PieceDemoAudioResponse();
        response.setId(audio.getId());
        response.setPieceId(audio.getPieceId());
        response.setLabel(audio.getLabel());
        response.setOriginalName(audio.getOriginalName());
        response.setSortOrder(audio.getSortOrder());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPieceId() {
        return pieceId;
    }

    public void setPieceId(Long pieceId) {
        this.pieceId = pieceId;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
