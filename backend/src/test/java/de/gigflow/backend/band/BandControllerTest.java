package de.gigflow.backend.band;

import de.gigflow.backend.user.JwtService;
import de.gigflow.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BandController.class)
@AutoConfigureMockMvc(addFilters = false)
class BandControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BandService bandService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void blankNameShouldReturnBadRequest() throws Exception {
        mockMvc.perform(post("/api/bands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deleteBandReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/bands/2"))
                .andExpect(status().isNoContent());

        verify(bandService).deleteBand(2L);
    }

    @Test
    void deleteBandReturnsNotFoundForUnknownBand() throws Exception {
        doThrow(new IllegalArgumentException("Band nicht gefunden: 999"))
                .when(bandService).deleteBand(999L);

        mockMvc.perform(delete("/api/bands/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteBandReturnsConflictWhenEventsExist() throws Exception {
        doThrow(new IllegalArgumentException(
                "„Nordlicht“ kann nicht gelöscht werden: noch Gigs/Proben zugeordnet."))
                .when(bandService).deleteBand(2L);

        mockMvc.perform(delete("/api/bands/2"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("„Nordlicht“ kann nicht gelöscht werden: noch Gigs/Proben zugeordnet."));
    }
}
