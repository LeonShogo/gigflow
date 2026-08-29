package de.gigflow.backend.equipment;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class EquipmentService {

    private final EquipmentRepository equipmentRepository;

    public EquipmentService(EquipmentRepository equipmentRepository) {
        this.equipmentRepository = equipmentRepository;
    }

    public EquipmentResponse createEquipment(EquipmentRequest request) {
        Equipment equipment = new Equipment();
        equipment.setName(request.getName());
        equipment.setCategory(request.getCategory());
        return EquipmentResponse.from(equipmentRepository.save(equipment));
    }

    public Optional<EquipmentResponse> findEquipmentById(Long id) {
        return equipmentRepository.findById(id).map(EquipmentResponse::from);
    }

    public List<EquipmentResponse> findAllEquipment() {
        return equipmentRepository.findAll().stream().map(EquipmentResponse::from).toList();
    }

    public EquipmentResponse updateEquipment(Long id, EquipmentRequest request) {
        Equipment existing = equipmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Equipment nicht gefunden: " + id));
        existing.setName(request.getName());
        existing.setCategory(request.getCategory());
        return EquipmentResponse.from(equipmentRepository.save(existing));
    }

    public void deleteEquipment(Long id) {
        equipmentRepository.deleteById(id);
    }
}
