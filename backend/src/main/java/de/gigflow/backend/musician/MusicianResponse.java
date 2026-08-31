package de.gigflow.backend.musician;

public class MusicianResponse {

    private Long id;
    private String firstName;
    private String lastName;
    private String instrument;
    private String email;
    private boolean emailPublic;

    public static MusicianResponse from(Musician musician) {
        MusicianResponse response = new MusicianResponse();
        response.setId(musician.getId());
        response.setFirstName(musician.getFirstName());
        response.setLastName(musician.getLastName());
        response.setInstrument(musician.getInstrument());
        response.setEmail(musician.getEmail());
        response.setEmailPublic(musician.isEmailPublic());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getInstrument() {
        return instrument;
    }

    public void setInstrument(String instrument) {
        this.instrument = instrument;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isEmailPublic() {
        return emailPublic;
    }

    public void setEmailPublic(boolean emailPublic) {
        this.emailPublic = emailPublic;
    }
}
