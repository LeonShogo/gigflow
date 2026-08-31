package de.gigflow.backend.event;

import de.gigflow.backend.musician.MusicianPublicDto;

public class EventParticipationResponseDto {

    private Long id;
    private Long eventId;
    private Long musicianId;
    private MusicianPublicDto musician;
    private EventParticipationStatus status;

    public static EventParticipationResponseDto from(EventParticipation participation) {
        EventParticipationResponseDto response = new EventParticipationResponseDto();
        response.setId(participation.getId());
        if (participation.getEvent() != null) {
            response.setEventId(participation.getEvent().getId());
        }
        if (participation.getMusician() != null) {
            response.setMusicianId(participation.getMusician().getId());
            response.setMusician(MusicianPublicDto.from(participation.getMusician()));
        }
        response.setStatus(participation.getStatus());
        return response;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    public MusicianPublicDto getMusician() {
        return musician;
    }

    public void setMusician(MusicianPublicDto musician) {
        this.musician = musician;
    }

    public EventParticipationStatus getStatus() {
        return status;
    }

    public void setStatus(EventParticipationStatus status) {
        this.status = status;
    }
}
