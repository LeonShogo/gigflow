package de.gigflow.backend.setlist;

/** Sets or clears (null/blank) the optional YouTube link of a piece. */
public class PieceYoutubeRequest {

    private String youtubeUrl;

    public String getYoutubeUrl() {
        return youtubeUrl;
    }

    public void setYoutubeUrl(String youtubeUrl) {
        this.youtubeUrl = youtubeUrl;
    }
}