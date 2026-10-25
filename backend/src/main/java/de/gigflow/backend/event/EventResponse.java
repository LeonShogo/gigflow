package de.gigflow.backend.event;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;

public class EventResponse {

    private Long id;
    private String title;
    private LocalDateTime dateTime;
    private EventType type;
    private Long bandId;
    private String bandName;
    private Long concertId;
    private Long createdByUserId;
    private EventEditPolicy editPolicy;
    private boolean canEdit;

    @JsonInclude(JsonInclude.Include.NON_EMPTY)
    private List<EventInvitationResponse> notifications = List.of();

    public static EventResponse from(Event event) {
        EventResponse response = new EventResponse();
        response.setId(event.getId());
        response.setTitle(event.getTitle());
        response.setDateTime(event.getDateTime());
        response.setType(event.getType());
        response.setCreatedByUserId(event.getCreatedByUserId());
        response.setEditPolicy(event.getEditPolicy());
        if (event.getBand() != null) {
            response.setBandId(event.getBand().getId());
            response.setBandName(event.getBand().getName());
        }
        if (event.getConcert() != null) {
            response.setConcertId(event.getConcert().getId());
        }
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public LocalDateTime getDateTime() {
        return dateTime;
    }

    public void setDateTime(LocalDateTime dateTime) {
        this.dateTime = dateTime;
    }

    public EventType getType() {
        return type;
    }

    public void setType(EventType type) {
        this.type = type;
    }

    public Long getBandId() {
        return bandId;
    }

    public void setBandId(Long bandId) {
        this.bandId = bandId;
    }

    public String getBandName() {
        return bandName;
    }

    public void setBandName(String bandName) {
        this.bandName = bandName;
    }

    public Long getConcertId() {
        return concertId;
    }

    public void setConcertId(Long concertId) {
        this.concertId = concertId;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(Long createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public EventEditPolicy getEditPolicy() {
        return editPolicy;
    }

    public void setEditPolicy(EventEditPolicy editPolicy) {
        this.editPolicy = editPolicy;
    }

    public boolean isCanEdit() {
        return canEdit;
    }

    public void setCanEdit(boolean canEdit) {
        this.canEdit = canEdit;
    }

    public List<EventInvitationResponse> getNotifications() {
        return notifications;
    }

    public void setNotifications(List<EventInvitationResponse> notifications) {
        this.notifications = notifications == null ? List.of() : notifications;
    }
}
