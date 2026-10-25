package de.gigflow.backend.setlist;

import java.util.List;

public class SetlistEntryResponse {

    private Long id;
    private Long setlistId;
    private Long pieceId;
    private Long pieceCreatedByUserId;
    private String pieceTitle;
    private String notes;
    private List<PieceSheetResponse> sheets = List.of();
    private List<PieceDemoAudioResponse> demoAudios = List.of();
    private List<PieceLinkResponse> links = List.of();
    private boolean hasDemoAudio;
    private String youtubeUrl;
    private int position;

    public static SetlistEntryResponse from(SetlistEntry entry, List<PieceSheet> sheets) {
        return from(entry, sheets, List.of(), List.of());
    }

    public static SetlistEntryResponse from(
            SetlistEntry entry,
            List<PieceSheet> sheets,
            List<PieceDemoAudio> demoAudios,
            List<PieceLink> links) {
        SetlistEntryResponse response = new SetlistEntryResponse();
        response.setId(entry.getId());
        if (entry.getSetlist() != null) {
            response.setSetlistId(entry.getSetlist().getId());
        }
        if (entry.getPiece() != null) {
            response.setPieceId(entry.getPiece().getId());
            response.setPieceCreatedByUserId(entry.getPiece().getCreatedByUserId());
            response.setPieceTitle(entry.getPiece().getTitle());
            response.setNotes(entry.getPiece().getNotes());
            response.setSheets(sheets.stream().map(PieceSheetResponse::from).toList());
            response.setDemoAudios(demoAudios.stream().map(PieceDemoAudioResponse::from).toList());
            response.setLinks(links.stream().map(PieceLinkResponse::from).toList());
            response.setHasDemoAudio(!demoAudios.isEmpty());
            response.setYoutubeUrl(links.stream()
                    .filter(link -> "YouTube".equalsIgnoreCase(link.getLabel()))
                    .findFirst()
                    .map(PieceLink::getUrl)
                    .orElse(null));
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

    public Long getPieceCreatedByUserId() {
        return pieceCreatedByUserId;
    }

    public void setPieceCreatedByUserId(Long pieceCreatedByUserId) {
        this.pieceCreatedByUserId = pieceCreatedByUserId;
    }

    public String getPieceTitle() {
        return pieceTitle;
    }

    public void setPieceTitle(String pieceTitle) {
        this.pieceTitle = pieceTitle;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public List<PieceSheetResponse> getSheets() {
        return sheets;
    }

    public void setSheets(List<PieceSheetResponse> sheets) {
        this.sheets = sheets;
    }

    public List<PieceDemoAudioResponse> getDemoAudios() {
        return demoAudios;
    }

    public void setDemoAudios(List<PieceDemoAudioResponse> demoAudios) {
        this.demoAudios = demoAudios;
    }

    public List<PieceLinkResponse> getLinks() {
        return links;
    }

    public void setLinks(List<PieceLinkResponse> links) {
        this.links = links;
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
