package de.gigflow.backend.equipment;

import jakarta.validation.constraints.NotNull;

public class EquipmentRequirementRequest {

    @NotNull
    private Long eventId;

    @NotNull
    private Long equipmentId;

    private boolean availableOnSite;

    private boolean needsToBeBrought;

    private Long responsibleMusicianId;

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }

    public Long getEquipmentId() {
        return equipmentId;
    }

    public void setEquipmentId(Long equipmentId) {
        this.equipmentId = equipmentId;
    }

    public boolean isAvailableOnSite() {
        return availableOnSite;
    }

    public void setAvailableOnSite(boolean availableOnSite) {
        this.availableOnSite = availableOnSite;
    }

    public boolean isNeedsToBeBrought() {
        return needsToBeBrought;
    }

    public void setNeedsToBeBrought(boolean needsToBeBrought) {
        this.needsToBeBrought = needsToBeBrought;
    }

    public Long getResponsibleMusicianId() {
        return responsibleMusicianId;
    }

    public void setResponsibleMusicianId(Long responsibleMusicianId) {
        this.responsibleMusicianId = responsibleMusicianId;
    }
}
