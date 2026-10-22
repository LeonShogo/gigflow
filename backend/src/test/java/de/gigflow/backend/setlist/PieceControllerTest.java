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
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    void uploadedSheetsShouldReturnCreatedList() throws Exception {
        PieceSheetResponse first = sheetResponse(7L, 1L, "Gitarre");
        PieceSheetResponse second = sheetResponse(8L, 1L, "Bass");
        when(pieceService.addSheets(eq(1L), any())).thenReturn(List.of(first, second));

        MockMultipartFile guitar = new MockMultipartFile(
                "files", "Gitarre.pdf", "application/pdf", new byte[]{1, 2, 3});
        MockMultipartFile bass = new MockMultipartFile(
                "files", "Bass.pdf", "application/pdf", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/pieces/1/sheets").file(guitar).file(bass))
                .andExpect(status().isCreated())
                .andExpect(content().json("""
                        [
                          {"id":7,"pieceId":1,"label":"Gitarre","originalName":"Gitarre.pdf"},
                          {"id":8,"pieceId":1,"label":"Bass","originalName":"Bass.pdf"}
                        ]
                        """));
    }

    @Test
    void invalidSheetFileShouldReturnBadRequest() throws Exception {
        when(pieceService.addSheets(eq(1L), any()))
                .thenThrow(new IllegalArgumentException("Nur PDF-Dateien sind erlaubt"));

        MockMultipartFile file = new MockMultipartFile(
                "files", "noten.txt", "text/plain", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/pieces/1/sheets").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sheetsOfUnknownPieceShouldReturnNotFound() throws Exception {
        when(pieceService.findSheets(99L))
                .thenThrow(new IllegalArgumentException("Stück nicht gefunden: 99"));

        mockMvc.perform(get("/api/pieces/99/sheets"))
                .andExpect(status().isNotFound());
    }

    @Test
    void sheetsShouldBeListed() throws Exception {
        when(pieceService.findSheets(1L)).thenReturn(List.of(sheetResponse(7L, 1L, "Gitarre")));

        mockMvc.perform(get("/api/pieces/1/sheets"))
                .andExpect(status().isOk())
                .andExpect(content().json(
                        "[{\"id\":7,\"pieceId\":1,\"label\":\"Gitarre\",\"originalName\":\"Gitarre.pdf\"}]"));
    }

    @Test
    void uploadedDemoAudioShouldReturnUpdatedPiece() throws Exception {
        PieceResponse updated = new PieceResponse();
        updated.setId(1L);
        updated.setTitle("Hallo Welt");
        updated.setHasDemoAudio(true);
        when(pieceService.saveDemoAudio(eq(1L), any())).thenReturn(updated);

        MockMultipartFile file = new MockMultipartFile(
                "file", "demo.mp3", "audio/mpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/pieces/1/demo-audio").file(file))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"id\":1,\"title\":\"Hallo Welt\",\"hasDemoAudio\":true}"));
    }

    @Test
    void invalidAudioShouldReturnBadRequest() throws Exception {
        when(pieceService.saveDemoAudio(eq(1L), any()))
                .thenThrow(new IllegalArgumentException("Nur MP3-Dateien sind erlaubt"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "demo.txt", "text/plain", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/pieces/1/demo-audio").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingAudioShouldReturnNotFound() throws Exception {
        when(pieceService.loadDemoAudio(1L)).thenReturn(java.util.Optional.empty());

        mockMvc.perform(get("/api/pieces/1/demo-audio"))
                .andExpect(status().isNotFound());
    }

    @Test
    void existingAudioShouldBeDownloadedAsMpeg() throws Exception {
        Path audio = tempDir.resolve("piece-1.mp3");
        byte[] bytes = new byte[]{1, 2, 3};
        Files.write(audio, bytes);
        when(pieceService.loadDemoAudio(1L))
                .thenReturn(java.util.Optional.of(new PieceService.DemoAudioFile(audio, "demo.mp3")));

        mockMvc.perform(get("/api/pieces/1/demo-audio"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("audio/mpeg"))
                .andExpect(content().bytes(bytes));
    }

    @Test
    void youtubeUpdateShouldReturnUpdatedPiece() throws Exception {
        PieceResponse updated = new PieceResponse();
        updated.setId(1L);
        updated.setTitle("Hallo Welt");
        updated.setYoutubeUrl("https://youtu.be/abc123");
        when(pieceService.setYoutubeUrl(eq(1L), eq("https://youtu.be/abc123"))).thenReturn(updated);

        mockMvc.perform(put("/api/pieces/1/youtube")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"youtubeUrl\":\"https://youtu.be/abc123\"}"))
                .andExpect(status().isOk())
                .andExpect(content().json(
                        "{\"id\":1,\"title\":\"Hallo Welt\",\"youtubeUrl\":\"https://youtu.be/abc123\"}"));
    }

    @Test
    void youtubeUpdateShouldRejectInvalidLink() throws Exception {
        when(pieceService.setYoutubeUrl(eq(1L), eq("https://example.com")))
                .thenThrow(new IllegalArgumentException("Nur YouTube-Links sind erlaubt"));

        mockMvc.perform(put("/api/pieces/1/youtube")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"youtubeUrl\":\"https://example.com\"}"))
                .andExpect(status().isBadRequest());
    }

    private PieceSheetResponse sheetResponse(Long id, Long pieceId, String label) {
        PieceSheetResponse response = new PieceSheetResponse();
        response.setId(id);
        response.setPieceId(pieceId);
        response.setLabel(label);
        response.setOriginalName(label + ".pdf");
        return response;
    }
}