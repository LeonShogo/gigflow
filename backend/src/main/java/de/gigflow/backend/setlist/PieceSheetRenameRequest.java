package de.gigflow.backend.setlist;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PieceSheetRenameRequest {

    @NotBlank
    @Size(max = 120)
    private String label;

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }
}
