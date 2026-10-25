package de.gigflow.backend.setlist;

import de.gigflow.backend.event.EventOwnershipService;
import de.gigflow.backend.user.AuthenticatedUser;
import de.gigflow.backend.user.JwtService;
import de.gigflow.backend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PieceSheetController.class)
@AutoConfigureMockMvc(addFilters = false)
class PieceSheetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PieceService pieceService;

    @MockitoBean
    private EventOwnershipService ownershipService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @TempDir
    Path tempDir;

    @BeforeEach
    void allowTestOwnerRequests() {
        when(ownershipService.canManageSheet(nullable(AuthenticatedUser.class), anyLong())).thenReturn(true);
    }

    @Test
    void missingSheetShouldReturnNotFound() throws Exception {
        when(pieceService.loadSheet(7L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/piece-sheets/7"))
                .andExpect(status().isNotFound());
    }

    @Test
    void sheetShouldBeServedInline() throws Exception {
        Path pdf = tempDir.resolve("sheet.pdf");
        byte[] bytes = new byte[]{37, 80, 68, 70, 45};
        Files.write(pdf, bytes);
        when(pieceService.loadSheet(7L))
                .thenReturn(Optional.of(new PieceService.SheetFile(pdf, "Gitarre.pdf")));

        mockMvc.perform(get("/api/piece-sheets/7"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.startsWith("inline")))
                .andExpect(content().bytes(bytes));
    }

    @Test
    void sheetWithDownloadParamShouldBeAttachment() throws Exception {
        Path pdf = tempDir.resolve("sheet.pdf");
        byte[] bytes = new byte[]{37, 80, 68, 70, 45};
        Files.write(pdf, bytes);
        when(pieceService.loadSheet(7L))
                .thenReturn(Optional.of(new PieceService.SheetFile(pdf, "Gitarre.pdf")));

        mockMvc.perform(get("/api/piece-sheets/7").param("download", "true"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.startsWith("attachment")))
                .andExpect(content().bytes(bytes));
    }

    @Test
    void renameShouldReturnUpdatedSheet() throws Exception {
        PieceSheetResponse updated = new PieceSheetResponse();
        updated.setId(7L);
        updated.setPieceId(1L);
        updated.setLabel("Gitarre 1");
        updated.setOriginalName("Gitarre.pdf");
        when(pieceService.renameSheet(7L, "Gitarre 1")).thenReturn(updated);

        mockMvc.perform(put("/api/piece-sheets/7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"label\":\"Gitarre 1\"}"))
                .andExpect(status().isOk())
                .andExpect(content().json(
                        "{\"id\":7,\"pieceId\":1,\"label\":\"Gitarre 1\",\"originalName\":\"Gitarre.pdf\"}"));
    }

    @Test
    void blankLabelShouldReturnBadRequest() throws Exception {
        mockMvc.perform(put("/api/piece-sheets/7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"label\":\"  \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void renameUnknownSheetShouldReturnNotFound() throws Exception {
        when(pieceService.renameSheet(eq(99L), eq("Gitarre")))
                .thenThrow(new IllegalArgumentException("Notenblatt nicht gefunden: 99"));

        mockMvc.perform(put("/api/piece-sheets/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"label\":\"Gitarre\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteShouldReturnNoContent() throws Exception {
        mockMvc.perform(delete("/api/piece-sheets/7"))
                .andExpect(status().isNoContent());

        verify(pieceService).deleteSheet(7L);
    }
}
