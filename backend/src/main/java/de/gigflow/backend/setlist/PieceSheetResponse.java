package de.gigflow.backend.setlist;

public class PieceSheetResponse {

    private Long id;
    private Long pieceId;
    private String label;
    private String originalName;

    public static PieceSheetResponse from(PieceSheet sheet) {
        PieceSheetResponse response = new PieceSheetResponse();
        response.setId(sheet.getId());
        response.setPieceId(sheet.getPieceId());
        response.setLabel(sheet.getLabel());
        response.setOriginalName(sheet.getOriginalName());
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
}
