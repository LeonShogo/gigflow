package de.gigflow.backend.setlist;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PieceServiceTest {

    @TempDir
    Path tempDir;

    private PieceRepository pieceRepository;
    private PieceSheetRepository sheetRepository;
    private PieceService pieceService;

    @BeforeEach
    void setUp() {
        pieceRepository = mock(PieceRepository.class);
        sheetRepository = mock(PieceSheetRepository.class);
        pieceService = new PieceService(pieceRepository, sheetRepository, tempDir.toString());
    }

    @Test
    void addSheetsStoresFilesAndMetadata() throws Exception {
        when(pieceRepository.existsById(1L)).thenReturn(true);
        when(sheetRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of());
        when(sheetRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<PieceSheetResponse> created = pieceService.addSheets(1L, List.of(
                new MockMultipartFile("files", "Gitarre.pdf", "application/pdf", new byte[]{37, 80, 68, 70}),
                new MockMultipartFile("files", "Bass.pdf", "application/pdf", new byte[]{37, 80, 68, 70})));

        assertEquals(List.of("Gitarre", "Bass"), created.stream().map(PieceSheetResponse::getLabel).toList());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PieceSheet>> captor = ArgumentCaptor.forClass(List.class);
        verify(sheetRepository).saveAll(captor.capture());
        List<PieceSheet> saved = captor.getValue();
        assertTrue(saved.get(0).getStoredPath().matches("piece-1-sheet-[a-f0-9-]+\\.pdf"));
        assertTrue(Files.isRegularFile(tempDir.resolve(saved.get(0).getStoredPath())));
        assertTrue(Files.isRegularFile(tempDir.resolve(saved.get(1).getStoredPath())));
        assertEquals(0, saved.get(0).getSortOrder());
        assertEquals(1, saved.get(1).getSortOrder());
        assertEquals("Gitarre.pdf", saved.get(0).getOriginalName());
    }

    @Test
    void addSheetsUsesDefaultLabelWhenFileNameHasNoUsableStem() {
        when(pieceRepository.existsById(1L)).thenReturn(true);
        when(sheetRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of());
        when(sheetRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<PieceSheetResponse> created = pieceService.addSheets(1L, List.of(
                new MockMultipartFile("files", ".pdf", "application/pdf", new byte[]{37, 80, 68, 70})));

        assertEquals("Noten", created.get(0).getLabel());
    }

    @Test
    void addSheetsAcceptsPdfContentTypeWithoutFileNameExtension() {
        when(pieceRepository.existsById(1L)).thenReturn(true);
        when(sheetRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of());
        when(sheetRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<PieceSheetResponse> created = pieceService.addSheets(1L, List.of(
                new MockMultipartFile("files", "Gitarre", "application/pdf", new byte[]{37, 80, 68, 70})));

        assertEquals("Gitarre", created.get(0).getLabel());
        assertEquals("Gitarre.pdf", created.get(0).getOriginalName());
    }

    @Test
    void addSheetsAppendsAfterExistingOnes() {
        when(pieceRepository.existsById(1L)).thenReturn(true);
        PieceSheet existing = sheet(9L, 1L, "Alt", "alt.pdf", 4);
        when(sheetRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of(existing));
        when(sheetRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        pieceService.addSheets(1L, List.of(
                new MockMultipartFile("files", "Neu.pdf", "application/pdf", new byte[]{37, 80, 68, 70})));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<PieceSheet>> captor = ArgumentCaptor.forClass(List.class);
        verify(sheetRepository).saveAll(captor.capture());
        assertEquals(5, captor.getValue().get(0).getSortOrder());
    }

    @Test
    void addSheetsRejectsNonPdf() {
        when(pieceRepository.existsById(1L)).thenReturn(true);

        MockMultipartFile txt = new MockMultipartFile(
                "files", "noten.txt", "text/plain", new byte[]{1, 2, 3});

        assertThrows(IllegalArgumentException.class, () -> pieceService.addSheets(1L, List.of(txt)));
        verify(sheetRepository, never()).saveAll(any());
    }

    @Test
    void addSheetsRejectsUnknownPiece() {
        when(pieceRepository.existsById(99L)).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> pieceService.addSheets(99L, List.of(
                new MockMultipartFile("files", "Noten.pdf", "application/pdf", new byte[]{1}))));
    }

    @Test
    void findSheetsReturnsSheetsInOrder() {
        when(pieceRepository.existsById(1L)).thenReturn(true);
        when(sheetRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of(
                sheet(2L, 1L, "Bass", "bass.pdf", 1),
                sheet(1L, 1L, "Gitarre", "gitarre.pdf", 0)));

        List<PieceSheetResponse> sheets = pieceService.findSheets(1L);

        assertEquals(List.of("Bass", "Gitarre"), sheets.stream().map(PieceSheetResponse::getLabel).toList());
    }

    @Test
    void loadSheetReturnsStoredFile() throws Exception {
        Files.write(tempDir.resolve("piece-1-sheet-abc.pdf"), new byte[]{37, 80, 68, 70});
        PieceSheet sheet = sheet(7L, 1L, "Gitarre", "Gitarre.pdf", 0);
        sheet.setStoredPath("piece-1-sheet-abc.pdf");
        when(sheetRepository.findById(7L)).thenReturn(Optional.of(sheet));

        Optional<PieceService.SheetFile> loaded = pieceService.loadSheet(7L);

        assertTrue(loaded.isPresent());
        assertEquals("Gitarre.pdf", loaded.get().originalName());
    }

    @Test
    void loadSheetReturnsEmptyForMissingRecord() {
        when(sheetRepository.findById(7L)).thenReturn(Optional.empty());

        assertTrue(pieceService.loadSheet(7L).isEmpty());
    }

    @Test
    void renameSheetSavesTrimmedLabel() {
        PieceSheet sheet = sheet(7L, 1L, "Alt", "Gitarre.pdf", 0);
        when(sheetRepository.findById(7L)).thenReturn(Optional.of(sheet));
        when(sheetRepository.save(any(PieceSheet.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PieceSheetResponse response = pieceService.renameSheet(7L, "  Gitarre 1  ");

        assertEquals("Gitarre 1", response.getLabel());
    }

    @Test
    void renameSheetRejectsBlankLabel() {
        when(sheetRepository.findById(7L))
                .thenReturn(Optional.of(sheet(7L, 1L, "Alt", "alt.pdf", 0)));

        assertThrows(IllegalArgumentException.class, () -> pieceService.renameSheet(7L, "  "));
    }

    @Test
    void deleteSheetDeletesFileAndRecord() throws Exception {
        Path saved = tempDir.resolve("piece-1-sheet-abc.pdf");
        Files.write(saved, new byte[]{1, 2, 3});
        PieceSheet sheet = sheet(7L, 1L, "Gitarre", "Gitarre.pdf", 0);
        sheet.setStoredPath("piece-1-sheet-abc.pdf");
        when(sheetRepository.findById(7L)).thenReturn(Optional.of(sheet));

        pieceService.deleteSheet(7L);

        assertFalse(Files.exists(saved));
        verify(sheetRepository).delete(sheet);
    }

    @Test
    void deletePieceRemovesAllSheets() throws Exception {
        Piece piece = new Piece();
        piece.setId(1L);
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));

        Path first = tempDir.resolve("piece-1-sheet-a.pdf");
        Path second = tempDir.resolve("piece-1-sheet-b.pdf");
        Files.write(first, new byte[]{1});
        Files.write(second, new byte[]{2});
        PieceSheet a = sheet(7L, 1L, "Gitarre", "Gitarre.pdf", 0);
        a.setStoredPath("piece-1-sheet-a.pdf");
        PieceSheet b = sheet(8L, 1L, "Bass", "Bass.pdf", 1);
        b.setStoredPath("piece-1-sheet-b.pdf");
        when(sheetRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of(a, b));

        pieceService.deletePiece(1L);

        assertFalse(Files.exists(first));
        assertFalse(Files.exists(second));
        verify(sheetRepository).deleteAll(List.of(a, b));
        verify(pieceRepository).deleteById(1L);
    }

    @Test
    void saveDemoAudioStoresFileAndMetadata() throws Exception {
        Piece piece = new Piece();
        piece.setId(1L);
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));
        when(pieceRepository.save(any(Piece.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PieceResponse response = pieceService.saveDemoAudio(1L, new MockMultipartFile(
                "file", "Demo.mp3", "audio/mpeg", new byte[]{1, 2, 3}));

        assertTrue(response.getHasDemoAudio());
        String storedName = piece.getDemoAudioPath();
        assertTrue(storedName.matches("piece-1-[a-f0-9-]+\\.mp3"));
        assertTrue(Files.isRegularFile(tempDir.resolve(storedName)));
        assertEquals("Demo.mp3", piece.getDemoAudioOriginalName());
    }

    @Test
    void saveDemoAudioRejectsNonMp3() {
        Piece piece = new Piece();
        piece.setId(1L);
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));

        MockMultipartFile txt = new MockMultipartFile(
                "file", "demo.txt", "text/plain", new byte[]{1, 2, 3});

        assertThrows(IllegalArgumentException.class, () -> pieceService.saveDemoAudio(1L, txt));
        assertNull(piece.getDemoAudioPath());
    }

    @Test
    void saveDemoAudioRejectsTooLargeFile() throws Exception {
        Piece piece = new Piece();
        piece.setId(1L);
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));

        MockMultipartFile big = new MockMultipartFile(
                "file", "big.mp3", "audio/mpeg", new byte[10 * 1024 * 1024 + 1]);

        assertThrows(IllegalArgumentException.class, () -> pieceService.saveDemoAudio(1L, big));
        assertNull(piece.getDemoAudioPath());
    }

    @Test
    void loadDemoAudioReturnsStoredFile() throws Exception {
        Files.write(tempDir.resolve("piece-1-abc.mp3"), new byte[]{1, 2, 3});
        Piece piece = new Piece();
        piece.setId(1L);
        piece.setDemoAudioPath("piece-1-abc.mp3");
        piece.setDemoAudioOriginalName("Demo.mp3");
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));

        Optional<PieceService.DemoAudioFile> loaded = pieceService.loadDemoAudio(1L);

        assertTrue(loaded.isPresent());
        assertEquals("Demo.mp3", loaded.get().originalName());
    }

    @Test
    void removeDemoAudioDeletesFileAndClearsMetadata() throws Exception {
        Path saved = tempDir.resolve("piece-1-abc.mp3");
        Files.write(saved, new byte[]{1, 2, 3});
        Piece piece = new Piece();
        piece.setId(1L);
        piece.setDemoAudioPath("piece-1-abc.mp3");
        piece.setDemoAudioOriginalName("Demo.mp3");
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));
        when(pieceRepository.save(any(Piece.class))).thenAnswer(invocation -> invocation.getArgument(0));

        pieceService.removeDemoAudio(1L);

        assertFalse(Files.exists(saved));
        assertNull(piece.getDemoAudioPath());
        assertNull(piece.getDemoAudioOriginalName());
    }

    @Test
    void setYoutubeUrlStoresValidLink() {
        Piece piece = new Piece();
        piece.setId(1L);
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));
        when(pieceRepository.save(any(Piece.class))).thenAnswer(invocation -> invocation.getArgument(0));

        pieceService.setYoutubeUrl(1L, "https://www.youtube.com/watch?v=abc123");

        assertEquals("https://www.youtube.com/watch?v=abc123", piece.getYoutubeUrl());
    }

    @Test
    void setYoutubeUrlClearsWhenBlank() {
        Piece piece = new Piece();
        piece.setId(1L);
        piece.setYoutubeUrl("https://youtu.be/abc123");
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));
        when(pieceRepository.save(any(Piece.class))).thenAnswer(invocation -> invocation.getArgument(0));

        pieceService.setYoutubeUrl(1L, "   ");

        assertNull(piece.getYoutubeUrl());
    }

    @Test
    void setYoutubeUrlRejectsNonYouTubeHost() {
        Piece piece = new Piece();
        piece.setId(1L);
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));

        assertThrows(IllegalArgumentException.class,
                () -> pieceService.setYoutubeUrl(1L, "https://example.com/watch?v=abc"));
    }

    private PieceSheet sheet(Long id, Long pieceId, String label, String originalName, int sortOrder) {
        PieceSheet sheet = new PieceSheet();
        sheet.setId(id);
        sheet.setPieceId(pieceId);
        sheet.setLabel(label);
        sheet.setOriginalName(originalName);
        sheet.setStoredPath("piece-" + pieceId + "-sheet-" + id + ".pdf");
        sheet.setSortOrder(sortOrder);
        return sheet;
    }
}