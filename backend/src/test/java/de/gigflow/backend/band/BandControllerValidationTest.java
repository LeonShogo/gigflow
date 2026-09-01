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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BandController.class)
@AutoConfigureMockMvc(addFilters = false)
class BandControllerValidationTest {

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
}
