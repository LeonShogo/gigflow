package de.gigflow.backend.event;

import jakarta.validation.constraints.NotNull;

public class EventParticipationRequestDto {

    @NotNull
    private Long eventId;

    @NotNull
    private Long musicianId;

    @NotNull
    private EventParticipationStatus status;

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }

    public Long getMusicianId() {
        return musicianId;
    }

    public void setMusicianId(Long musicianId) {
        this.musicianId = musicianId;
    }

    public EventParticipationStatus getStatus() {
        return status;
    }

    public void setStatus(EventParticipationStatus status) {
        this.status = status;
    }
}
