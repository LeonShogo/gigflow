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

    /** Stored filename of the demo audio MP3, relative to the upload directory. Null when absent. */
    @Column(name = "demo_audio_path")
    private String demoAudioPath;

    /** Original name of the uploaded MP3, used for the download Content-Disposition. */
    @Column(name = "demo_audio_original_name")
    private String demoAudioOriginalName;

    /** Optional YouTube link for the piece, e.g. a rehearsal or demo recording. */
    @Column(name = "youtube_url", length = 500)
    private String youtubeUrl;

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

    public String getDemoAudioPath() {
        return demoAudioPath;
    }

    public void setDemoAudioPath(String demoAudioPath) {
        this.demoAudioPath = demoAudioPath;
    }

    public String getDemoAudioOriginalName() {
        return demoAudioOriginalName;
    }

    public void setDemoAudioOriginalName(String demoAudioOriginalName) {
        this.demoAudioOriginalName = demoAudioOriginalName;
    }

    public String getYoutubeUrl() {
        return youtubeUrl;
    }

    public void setYoutubeUrl(String youtubeUrl) {
        this.youtubeUrl = youtubeUrl;
    }
}
