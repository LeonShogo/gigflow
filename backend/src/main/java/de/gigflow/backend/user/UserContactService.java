package de.gigflow.backend.user;

import de.gigflow.backend.event.EventParticipationRepository;
import de.gigflow.backend.event.EventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashSet;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class UserContactService {

    private final EventParticipationRepository participationRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    public UserContactService(
            EventParticipationRepository participationRepository,
            EventRepository eventRepository,
            UserRepository userRepository) {
        this.participationRepository = participationRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
    }

    public List<UserContactResponse> findContacts(AuthenticatedUser currentUser) {
        if (currentUser == null || currentUser.musicianId() == null) {
            return List.of();
        }
        Map<Long, UserContactResponse> contacts = new LinkedHashMap<>();
        Set<Long> interactionEventIds = new LinkedHashSet<>();
        participationRepository.findByMusicianId(currentUser.musicianId())
                .forEach(participation -> interactionEventIds.add(participation.getEvent().getId()));
        eventRepository.findByCreatedByUserId(currentUser.userId())
                .forEach(event -> interactionEventIds.add(event.getId()));
        interactionEventIds.forEach(eventId -> eventRepository.findById(eventId).ifPresent(event -> {
            if (event.getCreatedByUserId() != null) {
                userRepository.findById(event.getCreatedByUserId())
                        .filter(user -> !user.getId().equals(currentUser.userId()))
                        .ifPresent(user -> contacts.putIfAbsent(user.getId(), contact(user)));
            }
            participationRepository.findByEventId(eventId).forEach(participation -> {
                if (participation.getMusician() == null) {
                    return;
                }
                userRepository.findByMusicianId(participation.getMusician().getId()).stream()
                        .filter(user -> !user.getId().equals(currentUser.userId()))
                        .forEach(user -> contacts.putIfAbsent(user.getId(), contact(user)));
            });
        }));
        return contacts.values().stream()
                .sorted((left, right) -> left.getDisplayName().compareToIgnoreCase(right.getDisplayName()))
                .toList();
    }

    public boolean isKnownContact(AuthenticatedUser currentUser, Long targetUserId) {
        return findContacts(currentUser).stream().anyMatch(contact -> contact.getId().equals(targetUserId));
    }

    private UserContactResponse contact(User user) {
        String name = user.getMusician() == null
                ? user.getEmail()
                : (user.getMusician().getFirstName() + " " + user.getMusician().getLastName()).trim();
        return new UserContactResponse(user.getId(), user.getEmail(), name);
    }
}
