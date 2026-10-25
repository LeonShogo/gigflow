package de.gigflow.backend.event;

import de.gigflow.backend.user.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EventControllerTest {

    private EventService eventService;
    private EventParticipationService participationService;
    private EventOwnershipService ownershipService;
    private EventAccessService accessService;
    private EventController controller;

    @BeforeEach
    void setUp() {
        eventService = mock(EventService.class);
        participationService = mock(EventParticipationService.class);
        ownershipService = mock(EventOwnershipService.class);
        accessService = mock(EventAccessService.class);
        controller = new EventController(eventService, participationService, ownershipService, accessService);
    }

    @Test
    void creatingAnEventAssignsTheSignedInUserAsOwner() {
        AuthenticatedUser user = new AuthenticatedUser(41L, 7L);
        EventRequest request = eventRequest();
        EventResponse created = new EventResponse();
        created.setId(3L);
        created.setTitle("Sommerkonzert");
        created.setDateTime(request.getDateTime());
        created.setType(EventType.CONCERT);
        created.setBandId(2L);
        created.setCreatedByUserId(41L);
        when(eventService.createEvent(request, 41L)).thenReturn(created);

        var response = controller.createEvent(user, request);

        assertEquals(201, response.getStatusCode().value());
        assertSame(created, response.getBody());
        verify(eventService).createEvent(request, 41L);
    }

    @Test
    void anotherUserCannotDeleteAnEvent() {
        AuthenticatedUser user = new AuthenticatedUser(5L, 9L);
        when(ownershipService.ownsEvent(user, 3L)).thenReturn(false);

        var response = controller.deleteEvent(3L, user);

        assertEquals(403, response.getStatusCode().value());
        verify(eventService, never()).deleteEvent(3L);
    }

    @Test
    void anEventOwnerCanDeleteTheirEvent() {
        AuthenticatedUser user = new AuthenticatedUser(41L, 7L);
        when(ownershipService.ownsEvent(user, 3L)).thenReturn(true);
        when(eventService.findEventById(3L)).thenReturn(Optional.empty());

        var response = controller.deleteEvent(3L, user);

        assertEquals(204, response.getStatusCode().value());
        verify(eventService).deleteEvent(3L);
    }

    private EventRequest eventRequest() {
        EventRequest request = new EventRequest();
        request.setTitle("Sommerkonzert");
        request.setDateTime(LocalDateTime.parse("2026-09-12T20:00:00"));
        request.setType(EventType.CONCERT);
        request.setBandId(2L);
        return request;
    }
}
