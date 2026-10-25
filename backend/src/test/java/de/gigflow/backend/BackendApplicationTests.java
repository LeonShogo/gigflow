package de.gigflow.backend;

import de.gigflow.backend.event.EventResponse;
import de.gigflow.backend.event.EventService;
import de.gigflow.backend.user.User;
import de.gigflow.backend.user.UserRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class BackendApplicationTests {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EventService eventService;

    @Test
    void contextLoads() {
    }

    @Test
    void eventOverviewContainsOwnedAndParticipatedEventsOnly() {
        User participant = userRepository.findByEmail("musiker@gigflow.local").orElseThrow();
        Assertions.assertNotNull(participant.getMusician());

        var visibleEvents = eventService.findEventsVisibleToUser(participant.getId(), participant.getMusician().getId());
        Assertions.assertTrue(visibleEvents.stream().map(EventResponse::getTitle)
                .anyMatch("Streifzug durch die Nacht"::equals));
        Assertions.assertTrue(visibleEvents.stream().map(EventResponse::getTitle)
                .anyMatch("Generalprobe Streifzug"::equals));
        Assertions.assertFalse(visibleEvents.stream().map(EventResponse::getTitle)
                .anyMatch("Hafenrocker"::equals));
    }

}
