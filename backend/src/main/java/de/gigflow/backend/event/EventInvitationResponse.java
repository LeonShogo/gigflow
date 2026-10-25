package de.gigflow.backend.event;

public class EventInvitationResponse {

    private String email;
    private String invitationUrl;
    private boolean emailSent;
    private boolean alreadyAdded;
    private boolean alreadyMember;

    public EventInvitationResponse(String email, String invitationUrl, boolean emailSent, boolean alreadyAdded) {
        this(email, invitationUrl, emailSent, alreadyAdded, false);
    }

    public EventInvitationResponse(
            String email,
            String invitationUrl,
            boolean emailSent,
            boolean alreadyAdded,
            boolean alreadyMember) {
        this.email = email;
        this.invitationUrl = invitationUrl;
        this.emailSent = emailSent;
        this.alreadyAdded = alreadyAdded;
        this.alreadyMember = alreadyMember;
    }

    public String getEmail() {
        return email;
    }

    public String getInvitationUrl() {
        return invitationUrl;
    }

    public boolean isEmailSent() {
        return emailSent;
    }

    public boolean isAlreadyAdded() {
        return alreadyAdded;
    }

    public boolean isAlreadyMember() {
        return alreadyMember;
    }
}
