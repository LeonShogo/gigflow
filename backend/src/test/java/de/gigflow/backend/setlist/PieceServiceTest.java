package de.gigflow.backend.setlist;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
    private PieceDemoAudioRepository demoAudioRepository;
    private PieceLinkRepository linkRepository;
    private PieceService pieceService;

    @BeforeEach
    void setUp() {
        pieceRepository = mock(PieceRepository.class);
        sheetRepository = mock(PieceSheetRepository.class);
        demoAudioRepository = mock(PieceDemoAudioRepository.class);
        linkRepository = mock(PieceLinkRepository.class);
        pieceService = new PieceService(
                pieceRepository, sheetRepository, demoAudioRepository, linkRepository, tempDir.toString());
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
        when(pieceRepository.existsById(1L)).thenReturn(true);
        when(demoAudioRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L))
                .thenReturn(List.of(), List.of(new PieceDemoAudio()));
        when(demoAudioRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        PieceResponse response = pieceService.saveDemoAudio(1L, new MockMultipartFile(
                "file", "Demo.mp3", "audio/mpeg", new byte[]{1, 2, 3}));

        assertTrue(response.getHasDemoAudio());
        ArgumentCaptor<List<PieceDemoAudio>> captor = ArgumentCaptor.forClass(List.class);
        verify(demoAudioRepository).saveAll(captor.capture());
        PieceDemoAudio audio = captor.getValue().get(0);
        String storedName = audio.getStoredPath();
        assertTrue(storedName.matches("piece-1-[a-f0-9-]+\\.mp3"));
        assertTrue(Files.isRegularFile(tempDir.resolve(storedName)));
        assertEquals("Demo.mp3", audio.getOriginalName());
        assertEquals("Demo", audio.getLabel());
    }

    @Test
    void saveDemoAudioRejectsNonMp3() {
        when(pieceRepository.existsById(1L)).thenReturn(true);

        MockMultipartFile txt = new MockMultipartFile(
                "file", "demo.txt", "text/plain", new byte[]{1, 2, 3});

        assertThrows(IllegalArgumentException.class, () -> pieceService.saveDemoAudio(1L, txt));
        verify(demoAudioRepository, never()).saveAll(any());
    }

    @Test
    void saveDemoAudioRejectsTooLargeFile() throws Exception {
        when(pieceRepository.existsById(1L)).thenReturn(true);

        MockMultipartFile big = new MockMultipartFile(
                "file", "big.mp3", "audio/mpeg", new byte[10 * 1024 * 1024 + 1]);

        assertThrows(IllegalArgumentException.class, () -> pieceService.saveDemoAudio(1L, big));
        verify(demoAudioRepository, never()).saveAll(any());
    }

    @Test
    void loadDemoAudioReturnsStoredFile() throws Exception {
        Files.write(tempDir.resolve("piece-1-abc.mp3"), new byte[]{1, 2, 3});
        PieceDemoAudio audio = audio(7L, 1L, "Demo", "piece-1-abc.mp3", "Demo.mp3", 0);
        when(demoAudioRepository.findById(7L)).thenReturn(Optional.of(audio));

        Optional<PieceService.DemoAudioFile> loaded = pieceService.loadDemoAudioById(7L);

        assertTrue(loaded.isPresent());
        assertEquals("Demo.mp3", loaded.get().originalName());
    }

    @Test
    void removeDemoAudioDeletesFileAndRecord() throws Exception {
        Path saved = tempDir.resolve("piece-1-abc.mp3");
        Files.write(saved, new byte[]{1, 2, 3});
        PieceDemoAudio audio = audio(7L, 1L, "Demo", "piece-1-abc.mp3", "Demo.mp3", 0);
        when(demoAudioRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of(audio));
        when(demoAudioRepository.findById(7L)).thenReturn(Optional.of(audio));

        pieceService.removeDemoAudio(1L);

        assertFalse(Files.exists(saved));
        verify(demoAudioRepository).delete(audio);
    }

    @Test
    void setYoutubeUrlStoresValidLink() {
        Piece piece = piece(1L, "Hallo Welt");
        when(pieceRepository.existsById(1L)).thenReturn(true);
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));
        when(linkRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L)).thenReturn(List.of());
        when(linkRepository.save(any(PieceLink.class))).thenAnswer(invocation -> invocation.getArgument(0));

        pieceService.setYoutubeUrl(1L, "https://www.youtube.com/watch?v=abc123");

        ArgumentCaptor<PieceLink> captor = ArgumentCaptor.forClass(PieceLink.class);
        verify(linkRepository).save(captor.capture());
        assertEquals("YouTube", captor.getValue().getLabel());
        assertEquals("https://www.youtube.com/watch?v=abc123", captor.getValue().getUrl());
    }

    @Test
    void setYoutubeUrlClearsWhenBlank() {
        Piece piece = piece(1L, "Hallo Welt");
        PieceLink link = link(2L, 1L, "YouTube", "https://youtu.be/abc123", 0);
        when(pieceRepository.existsById(1L)).thenReturn(true);
        when(pieceRepository.findById(1L)).thenReturn(Optional.of(piece));
        when(linkRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L))
                .thenReturn(List.of(link), List.of());

        pieceService.setYoutubeUrl(1L, "   ");

        verify(linkRepository).delete(link);
    }

    @Test
    void setYoutubeUrlRejectsNonYouTubeHost() {
        when(pieceRepository.existsById(1L)).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> pieceService.setYoutubeUrl(1L, "https://example.com/watch?v=abc"));
    }

    @Test
    void createPieceStoresNotes() {
        when(pieceRepository.save(any(Piece.class))).thenAnswer(invocation -> {
            Piece saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });
        PieceRequest request = new PieceRequest();
        request.setTitle("Hallo Welt");
        request.setNotes("Intro zweimal, dann Refrain");

        PieceResponse response = pieceService.createPiece(request, 7L);

        assertEquals("Intro zweimal, dann Refrain", response.getNotes());
    }

    @Test
    void addDemoAudiosAppendsFilesAndSortOrder() {
        when(pieceRepository.existsById(1L)).thenReturn(true);
        when(demoAudioRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L))
                .thenReturn(List.of(audio(5L, 1L, "Alt", "old.mp3", "Old.mp3", 2)));
        when(demoAudioRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        List<PieceDemoAudioResponse> created = pieceService.addDemoAudios(1L, List.of(
                new MockMultipartFile("files", "Live.mp3", "audio/mpeg", new byte[]{1}),
                new MockMultipartFile("files", "Studio.mp3", "audio/mpeg", new byte[]{2})));

        assertEquals(List.of("Live", "Studio"), created.stream().map(PieceDemoAudioResponse::getLabel).toList());
        ArgumentCaptor<List<PieceDemoAudio>> captor = ArgumentCaptor.forClass(List.class);
        verify(demoAudioRepository).saveAll(captor.capture());
        assertEquals(List.of(3, 4), captor.getValue().stream().map(PieceDemoAudio::getSortOrder).toList());
    }

    @Test
    void addLinksAllowsMultipleHttpsUrls() {
        when(pieceRepository.existsById(1L)).thenReturn(true);
        List<PieceLink> savedLinks = new ArrayList<>();
        when(linkRepository.findByPieceIdOrderBySortOrderAscIdAsc(1L))
                .thenAnswer(invocation -> List.copyOf(savedLinks));
        when(linkRepository.save(any(PieceLink.class))).thenAnswer(invocation -> {
            PieceLink saved = invocation.getArgument(0);
            savedLinks.add(saved);
            return saved;
        });

        PieceLinkRequest video = new PieceLinkRequest();
        video.setLabel("Live video");
        video.setUrl("https://youtu.be/abc123");
        PieceLinkRequest recording = new PieceLinkRequest();
        recording.setLabel("Studio");
        recording.setUrl("https://example.org/song");

        pieceService.addLink(1L, video);
        pieceService.addLink(1L, recording);

        assertEquals(List.of("Live video", "Studio"), savedLinks.stream().map(PieceLink::getLabel).toList());
        assertEquals(List.of(0, 1), savedLinks.stream().map(PieceLink::getSortOrder).toList());
    }

    @Test
    void addLinkRejectsNonHttpUrls() {
        when(pieceRepository.existsById(1L)).thenReturn(true);
        PieceLinkRequest request = new PieceLinkRequest();
        request.setLabel("Unsafe");
        request.setUrl("javascript:alert(1)");

        assertThrows(IllegalArgumentException.class, () -> pieceService.addLink(1L, request));
        verify(linkRepository, never()).save(any(PieceLink.class));
    }

    private Piece piece(Long id, String title) {
        Piece piece = new Piece();
        piece.setId(id);
        piece.setTitle(title);
        return piece;
    }

    private PieceLink link(Long id, Long pieceId, String label, String url, int sortOrder) {
        PieceLink link = new PieceLink();
        link.setId(id);
        link.setPieceId(pieceId);
        link.setLabel(label);
        link.setUrl(url);
        link.setSortOrder(sortOrder);
        return link;
    }

    private PieceDemoAudio audio(
            Long id, Long pieceId, String label, String storedPath, String originalName, int sortOrder) {
        PieceDemoAudio audio = new PieceDemoAudio();
        audio.setId(id);
        audio.setPieceId(pieceId);
        audio.setLabel(label);
        audio.setStoredPath(storedPath);
        audio.setOriginalName(originalName);
        audio.setSortOrder(sortOrder);
        return audio;
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
