package de.gigflow.backend.event;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class EventRequest {

    @NotBlank
    private String title;

    @NotNull
    private LocalDateTime dateTime;

    @NotNull
    private EventType type;

    @NotNull
    private Long bandId;

    private Long concertId;

    private EventEditPolicy editPolicy = EventEditPolicy.OWNER_ONLY;

    private java.util.List<Long> editorUserIds = java.util.List.of();

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

    public Long getConcertId() {
        return concertId;
    }

    public void setConcertId(Long concertId) {
        this.concertId = concertId;
    }

    public EventEditPolicy getEditPolicy() {
        return editPolicy;
    }

    public void setEditPolicy(EventEditPolicy editPolicy) {
        this.editPolicy = editPolicy;
    }

    public java.util.List<Long> getEditorUserIds() {
        return editorUserIds;
    }

    public void setEditorUserIds(java.util.List<Long> editorUserIds) {
        this.editorUserIds = editorUserIds == null ? java.util.List.of() : editorUserIds;
    }
}
