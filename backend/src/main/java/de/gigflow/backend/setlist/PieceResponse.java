package de.gigflow.backend.setlist;

public class PieceResponse {

    private Long id;
    private String title;

    public static PieceResponse from(Piece piece) {
        PieceResponse response = new PieceResponse();
        response.setId(piece.getId());
        response.setTitle(piece.getTitle());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
