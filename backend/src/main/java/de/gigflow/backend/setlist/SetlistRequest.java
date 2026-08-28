package de.gigflow.backend.setlist;

import jakarta.validation.constraints.NotNull;

public class SetlistRequest {

    @NotNull
    private Long eventId;

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }
}
