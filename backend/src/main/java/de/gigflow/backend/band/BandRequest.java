package de.gigflow.backend.band;

import jakarta.validation.constraints.NotBlank;

public class BandRequest {

    @NotBlank
    private String name;

    private String genre;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getGenre() {
        return genre;
    }

    public void setGenre(String genre) {
        this.genre = genre;
    }
}
