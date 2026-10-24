package de.gigflow.backend.setlist;

import java.util.List;

public class PieceResponse {

    private Long id;
    private String title;
    private String notes;
    private boolean hasDemoAudio;
    private String youtubeUrl;
    private List<PieceDemoAudioResponse> demoAudios = List.of();
    private List<PieceLinkResponse> links = List.of();

    public static PieceResponse from(Piece piece, List<PieceDemoAudio> demoAudios, List<PieceLink> links) {
        PieceResponse response = new PieceResponse();
        response.setId(piece.getId());
        response.setTitle(piece.getTitle());
        response.setNotes(piece.getNotes());
        response.setDemoAudios(demoAudios.stream().map(PieceDemoAudioResponse::from).toList());
        response.setLinks(links.stream().map(PieceLinkResponse::from).toList());
        response.setHasDemoAudio(!demoAudios.isEmpty());
        response.setYoutubeUrl(links.stream()
                .filter(link -> "YouTube".equalsIgnoreCase(link.getLabel()))
                .findFirst()
                .map(PieceLink::getUrl)
                .orElse(null));
        return response;
    }

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

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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
}
