package de.gigflow.backend.location;

public class EventLocationResponse {

    private Long id;
    private Long eventId;
    private LocationType type;
    private String name;
    private String address;
    private String note;
    private String phone;
    private String mapsUrl;

    public static EventLocationResponse from(EventLocation location) {
        EventLocationResponse response = new EventLocationResponse();
        response.setId(location.getId());
        if (location.getEvent() != null) {
            response.setEventId(location.getEvent().getId());
        }
        response.setType(location.getType());
        response.setName(location.getName());
        response.setAddress(location.getAddress());
        response.setNote(location.getNote());
        response.setPhone(location.getPhone());
        response.setMapsUrl(location.getMapsUrl());
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

    public LocationType getType() {
        return type;
    }

    public void setType(LocationType type) {
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getMapsUrl() {
        return mapsUrl;
    }

    public void setMapsUrl(String mapsUrl) {
        this.mapsUrl = mapsUrl;
    }
}