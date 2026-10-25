package de.gigflow.backend.event;

import jakarta.validation.constraints.NotBlank;

public class EventInvitationAcceptRequest {

    @NotBlank
    private String token;

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}
