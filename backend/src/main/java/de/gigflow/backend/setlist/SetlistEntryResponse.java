package de.gigflow.backend.setlist;

import java.util.List;

public class SetlistEntryResponse {

    private Long id;
    private Long setlistId;
    private Long pieceId;
    private String pieceTitle;
    private List<PieceSheetResponse> sheets = List.of();
    private boolean hasDemoAudio;
    private String youtubeUrl;
    private int position;

    public static SetlistEntryResponse from(SetlistEntry entry, List<PieceSheet> sheets) {
        SetlistEntryResponse response = new SetlistEntryResponse();
        response.setId(entry.getId());
        if (entry.getSetlist() != null) {
            response.setSetlistId(entry.getSetlist().getId());
        }
        if (entry.getPiece() != null) {
            response.setPieceId(entry.getPiece().getId());
            response.setPieceTitle(entry.getPiece().getTitle());
            response.setSheets(sheets.stream().map(PieceSheetResponse::from).toList());
            response.setHasDemoAudio(entry.getPiece().getDemoAudioPath() != null);
            response.setYoutubeUrl(entry.getPiece().getYoutubeUrl());
        }
        response.setPosition(entry.getPosition());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSetlistId() {
        return setlistId;
    }

    public void setSetlistId(Long setlistId) {
        this.setlistId = setlistId;
    }

    public Long getPieceId() {
        return pieceId;
    }

    public void setPieceId(Long pieceId) {
        this.pieceId = pieceId;
    }

    public String getPieceTitle() {
        return pieceTitle;
    }

    public void setPieceTitle(String pieceTitle) {
        this.pieceTitle = pieceTitle;
    }

    public List<PieceSheetResponse> getSheets() {
        return sheets;
    }

    public void setSheets(List<PieceSheetResponse> sheets) {
        this.sheets = sheets;
    }

    public boolean getHasDemoAudio() {
        return hasDemoAudio;
    }

    public void setHasDemoAudio(boolean hasDemoAudio) {
        this.hasDemoAudio = hasDemoAudio;
    }

    public String getYoutubeUrl() {
        return youtubeUrl;
    }

    public void setYoutubeUrl(String youtubeUrl) {
        this.youtubeUrl = youtubeUrl;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }
}
