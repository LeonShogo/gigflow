package de.gigflow.backend.event;

public class EventInvitationResponse {

    private String invitationUrl;
    private java.time.LocalDateTime expiresAt;

    public EventInvitationResponse(String invitationUrl, java.time.LocalDateTime expiresAt) {
        this.invitationUrl = invitationUrl;
        this.expiresAt = expiresAt;
    }

    public String getInvitationUrl() {
        return invitationUrl;
    }

    public java.time.LocalDateTime getExpiresAt() {
        return expiresAt;
    }
}
