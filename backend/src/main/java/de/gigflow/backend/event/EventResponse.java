package de.gigflow.backend.event;

import java.time.LocalDateTime;

public class EventResponse {

    private Long id;
    private String title;
    private LocalDateTime dateTime;
    private EventType type;
    private Long bandId;

    public static EventResponse from(Event event) {
        EventResponse response = new EventResponse();
        response.setId(event.getId());
        response.setTitle(event.getTitle());
        response.setDateTime(event.getDateTime());
        response.setType(event.getType());
        if (event.getBand() != null) {
            response.setBandId(event.getBand().getId());
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
}
