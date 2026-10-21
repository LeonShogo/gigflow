package de.gigflow.backend.band;

import de.gigflow.backend.user.JwtService;
import de.gigflow.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BandMembershipController.class)
@AutoConfigureMockMvc(addFilters = false)
class BandMembershipControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BandMembershipService membershipService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void membershipsByMusicianShouldReturnMemberships() throws Exception {
        BandMembershipResponse response = new BandMembershipResponse();
        response.setId(42L);
        response.setBandId(1L);
        response.setMusicianId(5L);
        when(membershipService.findMembershipsByMusician(5L)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/memberships/musician/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(42))
                .andExpect(jsonPath("$[0].bandId").value(1));
    }
}
