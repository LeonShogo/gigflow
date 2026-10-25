package de.gigflow.backend.user;

public class UserContactResponse {

    private Long id;
    private String email;
    private String displayName;

    public UserContactResponse(Long id, String email, String displayName) {
        this.id = id;
        this.email = email;
        this.displayName = displayName;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }
}
