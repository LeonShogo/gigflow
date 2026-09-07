package de.gigflow.backend.setlist;

public class PieceResponse {

    private Long id;
    private String title;
    private boolean hasSheetPdf;
    private boolean hasDemoAudio;
    private String youtubeUrl;

    public static PieceResponse from(Piece piece) {
        PieceResponse response = new PieceResponse();
        response.setId(piece.getId());
        response.setTitle(piece.getTitle());
        response.setHasSheetPdf(piece.getSheetPdfPath() != null);
        response.setHasDemoAudio(piece.getDemoAudioPath() != null);
        response.setYoutubeUrl(piece.getYoutubeUrl());
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

    public boolean getHasSheetPdf() {
        return hasSheetPdf;
    }

    public void setHasSheetPdf(boolean hasSheetPdf) {
        this.hasSheetPdf = hasSheetPdf;
    }

    public boolean getHasDemoAudio() {
        return hasDemoAudio;
    }

    public void setHasDemoAudio(boolean hasDemoAudio) {
        this.hasDemoAudio = hasDemoAudio;
    }

    public String getYoutubeUrl() {
        return youtubeUrl;
    }

    public void setYoutubeUrl(String youtubeUrl) {
        this.youtubeUrl = youtubeUrl;
    }
}
