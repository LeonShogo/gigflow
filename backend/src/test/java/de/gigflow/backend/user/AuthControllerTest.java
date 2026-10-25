package de.gigflow.backend.user;

import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.musician.MusicianService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private MusicianService musicianService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void registerCreatesUserAndReturnsToken() throws Exception {
        User user = new User();
        user.setId(7L);
        user.setEmail("max@gigflow.local");
        user.setPasswordHash("hashed");
        when(userService.register("max@gigflow.local", "supersecret")).thenReturn(user);
        when(musicianService.createMusicianEntity("Max", "Mustermann", "Gitarre"))
                .thenReturn(new Musician());
        when(jwtService.generateToken(7L)).thenReturn("jwt-token");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"max@gigflow.local\",\"password\":\"supersecret\",\"firstName\":\"Max\",\"lastName\":\"Mustermann\",\"instrument\":\"Gitarre\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("jwt-token"))
                .andExpect(jsonPath("$.user.email").value("max@gigflow.local"))
                .andExpect(jsonPath("$.user.organizer").doesNotExist());

        verify(userService).linkToMusician(eq(user), any(Musician.class));
    }

    @Test
    void registerRejectsBlankFirstName() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"x@gigflow.local\",\"password\":\"supersecret\",\"firstName\":\"\",\"lastName\":\"M\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginReturnsTokenForValidCredentials() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setEmail("a@gigflow.local");
        user.setPasswordHash("hashed");
        when(userService.authenticate("a@gigflow.local", "correct")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(1L)).thenReturn("jwt-token");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@gigflow.local\",\"password\":\"correct\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token"));
    }

    @Test
    void loginReturnsUnauthorizedForBadCredentials() throws Exception {
        when(userService.authenticate(anyString(), anyString())).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@gigflow.local\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
    }
}
