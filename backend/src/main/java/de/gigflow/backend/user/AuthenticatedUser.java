package de.gigflow.backend.user;

/**
 * The authenticated principal resolved from a validated JWT.
 * Carries the ids needed for authorization without exposing the account email.
 */
public record AuthenticatedUser(Long userId, boolean organizer, Long musicianId) {
}
