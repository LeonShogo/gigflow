package de.gigflow.backend.setlist;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PieceLinkRequest {

    @NotBlank
    @Size(max = 120)
    private String label;

    @NotBlank
    @Size(max = 1000)
    private String url;

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
}
