package de.gigflow.backend.band;

public class BandResponse {

    private Long id;
    private String name;
    private String genre;

    public static BandResponse from(Band band) {
        BandResponse response = new BandResponse();
        response.setId(band.getId());
        response.setName(band.getName());
        response.setGenre(band.getGenre());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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
