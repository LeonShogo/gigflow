package de.gigflow.backend.setlist;

import de.gigflow.backend.user.JwtService;
import de.gigflow.backend.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PieceController.class)
@AutoConfigureMockMvc(addFilters = false)
class PieceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PieceService pieceService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @TempDir
    Path tempDir;

    @Test
    void uploadedPdfShouldReturnUpdatedPiece() throws Exception {
        PieceResponse updated = new PieceResponse();
        updated.setId(1L);
        updated.setTitle("Hallo Welt");
        updated.setHasSheetPdf(true);
        when(pieceService.saveSheetPdf(eq(1L), any())).thenReturn(updated);

        MockMultipartFile file = new MockMultipartFile(
                "file", "noten.pdf", "application/pdf", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/pieces/1/sheet-pdf").file(file))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"id\":1,\"title\":\"Hallo Welt\",\"hasSheetPdf\":true}"));
    }

    @Test
    void invalidFileShouldReturnBadRequest() throws Exception {
        when(pieceService.saveSheetPdf(eq(1L), any()))
                .thenThrow(new IllegalArgumentException("Nur PDF-Dateien sind erlaubt"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "noten.txt", "text/plain", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/pieces/1/sheet-pdf").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingPdfShouldReturnNotFound() throws Exception {
        when(pieceService.loadSheetPdf(1L)).thenReturn(java.util.Optional.empty());

        mockMvc.perform(get("/api/pieces/1/sheet-pdf"))
                .andExpect(status().isNotFound());
    }

    @Test
    void existingPdfShouldBeDownloaded() throws Exception {
        Path pdf = tempDir.resolve("piece-1.pdf");
        byte[] bytes = new byte[]{37, 80, 68, 70, 45};
        Files.write(pdf, bytes);
        when(pieceService.loadSheetPdf(1L))
                .thenReturn(java.util.Optional.of(new PieceService.SheetPdfFile(pdf, "noten.pdf")));

        mockMvc.perform(get("/api/pieces/1/sheet-pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(bytes));
    }
}