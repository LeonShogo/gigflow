package de.gigflow.backend.equipment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EquipmentRequirementRepository extends JpaRepository<EquipmentRequirement, Long> {

    List<EquipmentRequirement> findByEventId(Long eventId);

    List<EquipmentRequirement> findByResponsibleMusicianId(Long musicianId);
}
