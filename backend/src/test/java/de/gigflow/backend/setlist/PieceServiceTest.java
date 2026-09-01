package de.gigflow.backend.setlist;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PieceServiceTest {

    @TempDir
    Path tempDir;

    private PieceRepository pieceRepository;
    private PieceService pieceService;

    @BeforeEach
    void setUp() {
        pieceRepository = mock(PieceRepository.class);
        pieceService = new PieceService(pieceRepository, tempDir.toString());
    }

    @Test
    void saveSheetPdfStoresFileAndMetadata() throws Exception {
        Piece piece = new Piece();
        piece.setId(1L);
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));
        when(pieceRepository.save(any(Piece.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PieceResponse response = pieceService.saveSheetPdf(1L, new MockMultipartFile(
                "file", "Noten.pdf", "application/pdf", new byte[]{37, 80, 68, 70}));

        assertTrue(response.getHasSheetPdf());
        String storedName = piece.getSheetPdfPath();
        assertTrue(storedName.matches("piece-1-[a-f0-9-]+\\.pdf"));
        assertTrue(Files.isRegularFile(tempDir.resolve(storedName)));
        assertEquals("Noten.pdf", piece.getSheetPdfOriginalName());
    }

    @Test
    void saveSheetPdfRejectsNonPdf() {
        Piece piece = new Piece();
        piece.setId(1L);
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));

        MockMultipartFile txt = new MockMultipartFile(
                "file", "noten.txt", "text/plain", new byte[]{1, 2, 3});

        assertThrows(IllegalArgumentException.class, () -> pieceService.saveSheetPdf(1L, txt));
        assertNull(piece.getSheetPdfPath());
    }

    @Test
    void loadSheetPdfReturnsStoredFile() throws Exception {
        Files.write(tempDir.resolve("piece-1-abc.pdf"), new byte[]{37, 80, 68, 70});
        Piece piece = new Piece();
        piece.setId(1L);
        piece.setSheetPdfPath("piece-1-abc.pdf");
        piece.setSheetPdfOriginalName("Noten.pdf");
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));

        Optional<PieceService.SheetPdfFile> loaded = pieceService.loadSheetPdf(1L);

        assertTrue(loaded.isPresent());
        assertEquals("Noten.pdf", loaded.get().originalName());
    }

    @Test
    void removeSheetPdfDeletesFileAndClearsMetadata() throws Exception {
        Path saved = tempDir.resolve("piece-1-abc.pdf");
        Files.write(saved, new byte[]{1, 2, 3});
        Piece piece = new Piece();
        piece.setId(1L);
        piece.setSheetPdfPath("piece-1-abc.pdf");
        piece.setSheetPdfOriginalName("Noten.pdf");
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));
        when(pieceRepository.save(any(Piece.class))).thenAnswer(invocation -> invocation.getArgument(0));

        pieceService.removeSheetPdf(1L);

        assertFalse(Files.exists(saved));
        assertNull(piece.getSheetPdfPath());
        assertNull(piece.getSheetPdfOriginalName());
    }
}