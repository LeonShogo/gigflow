package de.gigflow.backend.setlist;

public class PieceLinkResponse {

    private Long id;
    private Long pieceId;
    private String label;
    private String url;
    private int sortOrder;

    public static PieceLinkResponse from(PieceLink link) {
        PieceLinkResponse response = new PieceLinkResponse();
        response.setId(link.getId());
        response.setPieceId(link.getPieceId());
        response.setLabel(link.getLabel());
        response.setUrl(link.getUrl());
        response.setSortOrder(link.getSortOrder());
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

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
