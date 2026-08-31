package de.gigflow.backend.schedule;

import java.time.LocalTime;

public class ScheduleItemResponse {

    private Long id;
    private Long eventId;
    private String label;
    private LocalTime time;

    public static ScheduleItemResponse from(ScheduleItem item) {
        ScheduleItemResponse response = new ScheduleItemResponse();
        response.setId(item.getId());
        if (item.getEvent() != null) {
            response.setEventId(item.getEvent().getId());
        }
        response.setLabel(item.getLabel());
        response.setTime(item.getTime());
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

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public LocalTime getTime() {
        return time;
    }

    public void setTime(LocalTime time) {
        this.time = time;
    }
}
