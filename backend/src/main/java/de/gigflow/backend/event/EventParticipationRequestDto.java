package de.gigflow.backend.event;

import jakarta.validation.constraints.NotNull;

public class EventParticipationRequestDto {

    public EventParticipationRequestDto() {
    }

    public EventParticipationRequestDto(Long eventId, Long musicianId, EventParticipationStatus status) {
        this.eventId = eventId;
        this.musicianId = musicianId;
        this.status = status;
    }

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
