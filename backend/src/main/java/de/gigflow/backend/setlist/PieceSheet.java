package de.gigflow.backend.setlist;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "piece_sheet")
public class PieceSheet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "piece_id", nullable = false)
    private Long pieceId;

    /** Human-readable part name, e.g. "Gitarre 1". Defaults to the uploaded file name. */
    @Column(nullable = false, length = 120)
    private String label;

    /** Stored filename of the PDF, relative to the upload directory. */
    @Column(name = "stored_path", nullable = false)
    private String storedPath;

    /** Original name of the uploaded PDF, used for the download Content-Disposition. */
    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPieceId() {
        return pieceId;
    }

    public void setPieceId(Long pieceId) {
        this.pieceId = pieceId;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getStoredPath() {
        return storedPath;
    }

    public void setStoredPath(String storedPath) {
        this.storedPath = storedPath;
    }

    public String getOriginalName() {
        return originalName;
    }

    public void setOriginalName(String originalName) {
        this.originalName = originalName;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
