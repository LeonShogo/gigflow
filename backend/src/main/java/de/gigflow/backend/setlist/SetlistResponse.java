package de.gigflow.backend.setlist;

public class SetlistResponse {

    private Long id;
    private Long eventId;

    public static SetlistResponse from(Setlist setlist) {
        SetlistResponse response = new SetlistResponse();
        response.setId(setlist.getId());
        if (setlist.getEvent() != null) {
            response.setEventId(setlist.getEvent().getId());
        }
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
}
