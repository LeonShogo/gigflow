package de.gigflow.backend.equipment;

import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.musician.MusicianPublicDto;
import org.springframework.lang.Nullable;

public class EquipmentRequirementResponse {

    private Long id;
    private Long eventId;
    private Long equipmentId;
    private String equipmentName;
    private String category;
    private RequirementState availableOnSite;
    private RequirementState needsToBeBrought;
    private Long responsibleMusicianId;
    private MusicianPublicDto responsibleMusician;

    public static EquipmentRequirementResponse from(EquipmentRequirement requirement) {
        EquipmentRequirementResponse response = new EquipmentRequirementResponse();
        response.setId(requirement.getId());
        if (requirement.getEvent() != null) {
            response.setEventId(requirement.getEvent().getId());
        }
        Equipment equipment = requirement.getEquipment();
        if (equipment != null) {
            response.setEquipmentId(equipment.getId());
            response.setEquipmentName(equipment.getName());
            response.setCategory(equipment.getCategory());
        }
        response.setAvailableOnSite(requirement.getAvailableOnSiteState());
        response.setNeedsToBeBrought(requirement.getNeedsToBeBroughtState());
        Musician responsible = requirement.getResponsibleMusician();
        if (responsible != null) {
            response.setResponsibleMusicianId(responsible.getId());
            response.setResponsibleMusician(MusicianPublicDto.from(responsible));
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

    public String getEquipmentName() {
        return equipmentName;
    }

    public void setEquipmentName(String equipmentName) {
        this.equipmentName = equipmentName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public RequirementState getAvailableOnSite() {
        return availableOnSite;
    }

    public void setAvailableOnSite(RequirementState availableOnSite) {
        this.availableOnSite = availableOnSite;
    }

    public RequirementState getNeedsToBeBrought() {
        return needsToBeBrought;
    }

    public void setNeedsToBeBrought(RequirementState needsToBeBrought) {
        this.needsToBeBrought = needsToBeBrought;
    }

    @Nullable
    public Long getResponsibleMusicianId() {
        return responsibleMusicianId;
    }

    public void setResponsibleMusicianId(Long responsibleMusicianId) {
        this.responsibleMusicianId = responsibleMusicianId;
    }

    @Nullable
    public MusicianPublicDto getResponsibleMusician() {
        return responsibleMusician;
    }

    public void setResponsibleMusician(MusicianPublicDto responsibleMusician) {
        this.responsibleMusician = responsibleMusician;
    }
}
