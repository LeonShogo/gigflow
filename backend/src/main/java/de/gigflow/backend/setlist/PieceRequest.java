package de.gigflow.backend.setlist;

import jakarta.validation.constraints.NotBlank;

public class PieceRequest {

    @NotBlank
    private String title;

    /** Optional YouTube link; null or blank clears it. */
    private String youtubeUrl;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getYoutubeUrl() {
        return youtubeUrl;
    }

    public void setYoutubeUrl(String youtubeUrl) {
        this.youtubeUrl = youtubeUrl;
    }
}
