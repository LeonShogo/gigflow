package de.gigflow.backend.setlist;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "piece")
public class Piece {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String title;

    /** Stored filename of the sheet music PDF, relative to the upload directory. Null when absent. */
    @Column(name = "sheet_pdf_path")
    private String sheetPdfPath;

    /** Original name of the uploaded PDF, used for the download Content-Disposition. */
    @Column(name = "sheet_pdf_original_name")
    private String sheetPdfOriginalName;

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

    public String getSheetPdfPath() {
        return sheetPdfPath;
    }

    public void setSheetPdfPath(String sheetPdfPath) {
        this.sheetPdfPath = sheetPdfPath;
    }

    public String getSheetPdfOriginalName() {
        return sheetPdfOriginalName;
    }

    public void setSheetPdfOriginalName(String sheetPdfOriginalName) {
        this.sheetPdfOriginalName = sheetPdfOriginalName;
    }
}
