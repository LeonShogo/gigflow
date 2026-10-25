package de.gigflow.backend.event;

import java.util.List;

public class EventMembersResponse {

    private final List<EventParticipationResponseDto> participations;
    private final List<EventInvitationResponse> notifications;

    public EventMembersResponse(
            List<EventParticipationResponseDto> participations,
            List<EventInvitationResponse> notifications) {
        this.participations = participations;
        this.notifications = notifications;
    }

    public List<EventParticipationResponseDto> getParticipations() {
        return participations;
    }

    public List<EventInvitationResponse> getNotifications() {
        return notifications;
    }
}
