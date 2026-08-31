package de.gigflow.backend.equipment;

/**
 * Tri-state for whether a piece of equipment is available on site / must be
 * brought. {@code UNKNOWN} is the neutral default for freshly added entries.
 */
public enum RequirementState {
    UNKNOWN,
    YES,
    NO
}
