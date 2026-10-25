package de.gigflow.backend.event;

import java.util.List;

public class EventAccessResponse {

    private EventEditPolicy editPolicy;
    private List<Long> editorUserIds;
    private List<EventInvitationResponse> notifications;

    public EventAccessResponse(
            EventEditPolicy editPolicy,
            List<Long> editorUserIds,
            List<EventInvitationResponse> notifications) {
        this.editPolicy = editPolicy;
        this.editorUserIds = editorUserIds;
        this.notifications = notifications;
    }

    public EventEditPolicy getEditPolicy() {
        return editPolicy;
    }

    public List<Long> getEditorUserIds() {
        return editorUserIds;
    }

    public List<EventInvitationResponse> getNotifications() {
        return notifications;
    }
}
