package de.gigflow.backend.setlist;

import jakarta.validation.constraints.NotBlank;

public class PieceRequest {

    @NotBlank
    private String title;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
