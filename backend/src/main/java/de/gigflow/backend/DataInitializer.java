package de.gigflow.backend;

import de.gigflow.backend.band.Band;
import de.gigflow.backend.band.BandRepository;
import de.gigflow.backend.event.Event;
import de.gigflow.backend.event.EventRepository;
import de.gigflow.backend.event.EventType;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {

    private final BandRepository bandRepository;
    private final EventRepository eventRepository;

    public DataInitializer(BandRepository bandRepository, EventRepository eventRepository) {
        this.bandRepository = bandRepository;
        this.eventRepository = eventRepository;
    }

    @Override
    public void run(String... args) {
        Band band = firstOrCreateBand();

        if (eventRepository.count() == 0) {
            event("Donnerstagsprobe", EventType.REHEARSAL, band, 2026, 9, 10, 18, 0, null);
        }

        boolean hasConcerts = eventRepository.findAll().stream()
                .anyMatch(e -> e.getType() == EventType.CONCERT);
        if (!hasConcerts) {
            event("Hafenrocker", EventType.CONCERT, band, 2026, 9, 12, 20, 0, null);
            event("Lagerfeuer-Open-Air", EventType.CONCERT, band, 2026, 10, 3, 19, 0, null);
            event("Generalprobe Open-Air", EventType.REHEARSAL, band, 2026, 10, 2, 16, 0, null);
        }
    }

    private Band firstOrCreateBand() {
        return bandRepository.findAll().stream().findFirst().orElseGet(() -> {
            Band band = new Band();
            band.setName("GigFlow Quartett");
            band.setGenre("Jazz / Indie");
            return bandRepository.save(band);
        });
    }

    private void event(String title, EventType type, Band band,
                       int year, int month, int day, int hour, int minute, Event concert) {
        Event event = new Event();
        event.setTitle(title);
        event.setType(type);
        event.setBand(band);
        event.setDateTime(LocalDateTime.of(year, month, day, hour, minute));
        event.setConcert(concert);
        eventRepository.save(event);
    }
}
