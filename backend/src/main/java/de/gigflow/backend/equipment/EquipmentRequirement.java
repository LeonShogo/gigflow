package de.gigflow.backend.equipment;

import de.gigflow.backend.event.Event;
import de.gigflow.backend.musician.Musician;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "equipment_requirement")
public class EquipmentRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @Column(nullable = false)
    private boolean availableOnSite;

    @Column(nullable = false)
    private boolean needsToBeBrought;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_musician_id")
    private Musician responsibleMusician;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Event getEvent() {
        return event;
    }

    public void setEvent(Event event) {
        this.event = event;
    }

    public Equipment getEquipment() {
        return equipment;
    }

    public void setEquipment(Equipment equipment) {
        this.equipment = equipment;
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

    public Musician getResponsibleMusician() {
        return responsibleMusician;
    }

    public void setResponsibleMusician(Musician responsibleMusician) {
        this.responsibleMusician = responsibleMusician;
    }
}
