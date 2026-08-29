package de.gigflow.backend.equipment;

import de.gigflow.backend.event.Event;
import de.gigflow.backend.event.EventRepository;
import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.musician.MusicianRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EquipmentRequirementService {

    private final EquipmentRequirementRepository requirementRepository;
    private final EventRepository eventRepository;
    private final EquipmentRepository equipmentRepository;
    private final MusicianRepository musicianRepository;

    public EquipmentRequirementService(EquipmentRequirementRepository requirementRepository,
                                       EventRepository eventRepository,
                                       EquipmentRepository equipmentRepository,
                                       MusicianRepository musicianRepository) {
        this.requirementRepository = requirementRepository;
        this.eventRepository = eventRepository;
        this.equipmentRepository = equipmentRepository;
        this.musicianRepository = musicianRepository;
    }

    public EquipmentRequirementResponse createRequirement(EquipmentRequirementRequest request) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + request.getEventId()));
        Equipment equipment = equipmentRepository.findById(request.getEquipmentId())
                .orElseThrow(() -> new IllegalArgumentException("Equipment nicht gefunden: " + request.getEquipmentId()));
        Musician responsible = resolveResponsibleMusician(request.getResponsibleMusicianId());

        EquipmentRequirement requirement = new EquipmentRequirement();
        requirement.setEvent(event);
        requirement.setEquipment(equipment);
        requirement.setAvailableOnSite(request.isAvailableOnSite());
        requirement.setNeedsToBeBrought(request.isNeedsToBeBrought());
        requirement.setResponsibleMusician(responsible);
        return EquipmentRequirementResponse.from(requirementRepository.save(requirement));
    }

    public Optional<EquipmentRequirementResponse> findRequirementById(Long id) {
        return requirementRepository.findById(id).map(EquipmentRequirementResponse::from);
    }

    public List<EquipmentRequirementResponse> findAllRequirements() {
        return requirementRepository.findAll().stream().map(EquipmentRequirementResponse::from).toList();
    }

    public EquipmentRequirementResponse updateRequirement(Long id, EquipmentRequirementRequest request) {
        EquipmentRequirement existing = requirementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Anforderung nicht gefunden: " + id));
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Event nicht gefunden: " + request.getEventId()));
        Equipment equipment = equipmentRepository.findById(request.getEquipmentId())
                .orElseThrow(() -> new IllegalArgumentException("Equipment nicht gefunden: " + request.getEquipmentId()));
        Musician responsible = resolveResponsibleMusician(request.getResponsibleMusicianId());

        existing.setEvent(event);
        existing.setEquipment(equipment);
        existing.setAvailableOnSite(request.isAvailableOnSite());
        existing.setNeedsToBeBrought(request.isNeedsToBeBrought());
        existing.setResponsibleMusician(responsible);
        return EquipmentRequirementResponse.from(requirementRepository.save(existing));
    }

    public void deleteRequirement(Long id) {
        requirementRepository.deleteById(id);
    }

    private Musician resolveResponsibleMusician(Long responsibleMusicianId) {
        if (responsibleMusicianId == null) {
            return null;
        }
        return musicianRepository.findById(responsibleMusicianId)
                .orElseThrow(() -> new IllegalArgumentException("Musiker:in nicht gefunden: " + responsibleMusicianId));
    }
}
