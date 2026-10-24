package de.gigflow.backend.setlist;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PieceRequest {

    @NotBlank
    private String title;

    @Size(max = 10000)
    private String notes;

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

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
