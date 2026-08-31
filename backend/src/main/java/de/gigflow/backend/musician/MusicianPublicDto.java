package de.gigflow.backend.musician;

public class MusicianPublicDto {

    private Long id;
    private String firstName;
    private String lastName;
    private String instrument;
    private String email;

    public static MusicianPublicDto from(Musician musician) {
        MusicianPublicDto dto = new MusicianPublicDto();
        dto.setId(musician.getId());
        dto.setFirstName(musician.getFirstName());
        dto.setLastName(musician.getLastName());
        dto.setInstrument(musician.getInstrument());
        if (musician.isEmailPublic()) {
            dto.setEmail(musician.getEmail());
        }
        return dto;
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
}
