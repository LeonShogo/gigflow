package de.gigflow.backend.setlist;

import de.gigflow.backend.user.JwtService;
import de.gigflow.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SetlistEntryController.class)
@AutoConfigureMockMvc(addFilters = false)
class SetlistEntryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SetlistEntryService entryService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void missingSetlistReturnsNotFound() throws Exception {
        when(entryService.createEntry(any(SetlistEntryRequest.class)))
                .thenThrow(new IllegalArgumentException("Setlist nicht gefunden"));

        mockMvc.perform(post("/api/setlist-entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"setlistId\":999,\"pieceId\":1,\"position\":0}"))
                .andExpect(status().isNotFound());
    }
}
