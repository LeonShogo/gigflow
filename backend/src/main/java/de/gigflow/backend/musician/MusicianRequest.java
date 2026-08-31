package de.gigflow.backend.musician;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class MusicianRequest {

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    private String instrument;

    @Email
    private String email;

    private boolean emailPublic;

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
