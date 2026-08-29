package de.gigflow.backend.equipment;

import de.gigflow.backend.musician.Musician;
import org.springframework.lang.Nullable;

public class EquipmentRequirementResponse {

    private Long id;
    private Long eventId;
    private Long equipmentId;
    private boolean availableOnSite;
    private boolean needsToBeBrought;
    private Long responsibleMusicianId;

    public static EquipmentRequirementResponse from(EquipmentRequirement requirement) {
        EquipmentRequirementResponse response = new EquipmentRequirementResponse();
        response.setId(requirement.getId());
        if (requirement.getEvent() != null) {
            response.setEventId(requirement.getEvent().getId());
        }
        if (requirement.getEquipment() != null) {
            response.setEquipmentId(requirement.getEquipment().getId());
        }
        response.setAvailableOnSite(requirement.isAvailableOnSite());
        response.setNeedsToBeBrought(requirement.isNeedsToBeBrought());
        Musician responsible = requirement.getResponsibleMusician();
        if (responsible != null) {
            response.setResponsibleMusicianId(responsible.getId());
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

    @Nullable
    public Long getResponsibleMusicianId() {
        return responsibleMusicianId;
    }

    public void setResponsibleMusicianId(Long responsibleMusicianId) {
        this.responsibleMusicianId = responsibleMusicianId;
    }
}
