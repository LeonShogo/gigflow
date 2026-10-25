package de.gigflow.backend.location;

import de.gigflow.backend.event.EventOwnershipService;
import de.gigflow.backend.user.AuthenticatedUser;
import de.gigflow.backend.user.JwtService;
import de.gigflow.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EventLocationController.class)
@AutoConfigureMockMvc(addFilters = false)
class EventLocationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EventLocationService eventLocationService;

    @MockitoBean
    private EventOwnershipService ownershipService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @BeforeEach
    void allowOwnerRequests() {
        when(ownershipService.ownsEvent(nullable(AuthenticatedUser.class), anyLong())).thenReturn(true);
        when(ownershipService.canEditEvent(nullable(AuthenticatedUser.class), anyLong())).thenReturn(true);
        when(ownershipService.canViewEvent(nullable(AuthenticatedUser.class), anyLong())).thenReturn(true);
        when(ownershipService.canManageLocation(nullable(AuthenticatedUser.class), anyLong())).thenReturn(true);
    }

    private EventLocationResponse location(Long id) {
        EventLocationResponse response = new EventLocationResponse();
        response.setId(id);
        response.setEventId(1L);
        response.setType(LocationType.VENUE);
        response.setName("Kulturfabrik");
        response.setAddress("Musterstraße 1, 12345 Berlin");
        return response;
    }

    @Test
    void createLocationShouldReturnCreated() throws Exception {
        when(eventLocationService.createEventLocation(any(EventLocationRequest.class))).thenReturn(location(1L));

        mockMvc.perform(post("/api/event-locations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":1,\"type\":\"VENUE\",\"name\":\"Kulturfabrik\",\"address\":\"Musterstraße 1, 12345 Berlin\"}"))
                .andExpect(status().isCreated())
                .andExpect(content().json("{\"id\":1,\"eventId\":1,\"type\":\"VENUE\",\"name\":\"Kulturfabrik\",\"address\":\"Musterstraße 1, 12345 Berlin\"}"));
    }

    @Test
    void invalidLocationShouldReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/event-locations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":1,\"type\":\"VENUE\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createLocationForMissingEventShouldReturnNotFound() throws Exception {
        when(eventLocationService.createEventLocation(any(EventLocationRequest.class)))
                .thenThrow(new IllegalArgumentException("Event nicht gefunden: 999"));

        mockMvc.perform(post("/api/event-locations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":999,\"type\":\"VENUE\",\"name\":\"Kulturfabrik\",\"address\":\"Musterstraße 1, 12345 Berlin\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void locationsByEventShouldReturnList() throws Exception {
        when(eventLocationService.findEventLocationsByEvent(1L)).thenReturn(List.of(location(1L), location(2L)));

        mockMvc.perform(get("/api/event-locations/event/1"))
                .andExpect(status().isOk())
                .andExpect(content().json("[{\"id\":1},{\"id\":2}]"));
    }

    @Test
    void existingLocationShouldBeReturned() throws Exception {
        when(eventLocationService.findEventLocationById(1L)).thenReturn(java.util.Optional.of(location(1L)));

        mockMvc.perform(get("/api/event-locations/1"))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"id\":1,\"name\":\"Kulturfabrik\"}"));
    }

    @Test
    void missingLocationShouldReturnNotFound() throws Exception {
        when(eventLocationService.findEventLocationById(1L)).thenReturn(java.util.Optional.empty());

        mockMvc.perform(get("/api/event-locations/1"))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateLocationShouldReturnUpdated() throws Exception {
        EventLocationResponse updated = location(1L);
        updated.setName("Neuer Name");
        when(eventLocationService.updateEventLocation(eq(1L), any(EventLocationRequest.class))).thenReturn(updated);

        mockMvc.perform(put("/api/event-locations/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"eventId\":1,\"type\":\"VENUE\",\"name\":\"Neuer Name\",\"address\":\"Musterstraße 1, 12345 Berlin\"}"))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"id\":1,\"name\":\"Neuer Name\"}"));
    }

    @Test
    void deleteLocationShouldReturnNoContent() throws Exception {
        mockMvc.perform(delete("/api/event-locations/1"))
                .andExpect(status().isNoContent());
    }
}
