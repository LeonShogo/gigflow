package de.gigflow.backend.musician;

import de.gigflow.backend.user.JwtService;
import de.gigflow.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MusicianController.class)
@AutoConfigureMockMvc(addFilters = false)
class MusicianControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MusicianService musicianService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void deleteAllMusiciansReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/musicians"))
                .andExpect(status().isNoContent());

        verify(musicianService).deleteAllMusicians();
    }

    @Test
    void deleteMusicianReturnsNoContentOnSuccess() throws Exception {
        mockMvc.perform(delete("/api/musicians/2"))
                .andExpect(status().isNoContent());

        verify(musicianService).deleteMusician(2L);
    }

    @Test
    void deleteMusicianReturnsNotFoundForUnknownMusician() throws Exception {
        doThrow(new IllegalArgumentException("Musiker:in nicht gefunden: 999"))
                .when(musicianService).deleteMusician(999L);

        mockMvc.perform(delete("/api/musicians/999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteMusicianReturnsConflictWithMessageWhenReferenced() throws Exception {
        doThrow(new IllegalArgumentException("„Anna Becker“ kann nicht gelöscht werden: noch zu Gigs/Proben zugeordnet."))
                .when(musicianService).deleteMusician(2L);

        mockMvc.perform(delete("/api/musicians/2"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("„Anna Becker“ kann nicht gelöscht werden: noch zu Gigs/Proben zugeordnet."));
    }
}
