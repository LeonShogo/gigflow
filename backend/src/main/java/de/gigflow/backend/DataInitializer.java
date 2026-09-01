package de.gigflow.backend;

import de.gigflow.backend.band.Band;
import de.gigflow.backend.band.BandRepository;
import de.gigflow.backend.event.Event;
import de.gigflow.backend.event.EventRepository;
import de.gigflow.backend.event.EventType;
import de.gigflow.backend.location.EventLocation;
import de.gigflow.backend.location.EventLocationRepository;
import de.gigflow.backend.location.LocationType;
import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.musician.MusicianService;
import de.gigflow.backend.user.User;
import de.gigflow.backend.user.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {

    private final BandRepository bandRepository;
    private final EventRepository eventRepository;
    private final EventLocationRepository eventLocationRepository;
    private final UserService userService;
    private final MusicianService musicianService;

    public DataInitializer(BandRepository bandRepository,
                           EventRepository eventRepository,
                           EventLocationRepository eventLocationRepository,
                           UserService userService,
                           MusicianService musicianService) {
        this.bandRepository = bandRepository;
        this.eventRepository = eventRepository;
        this.eventLocationRepository = eventLocationRepository;
        this.userService = userService;
        this.musicianService = musicianService;
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
            Event hafenRocker = event("Hafenrocker", EventType.CONCERT, band, 2026, 9, 12, 20, 0, null);
            Event lagerfeuer = event("Lagerfeuer-Open-Air", EventType.CONCERT, band, 2026, 10, 3, 19, 0, null);
            event("Generalprobe Open-Air", EventType.REHEARSAL, band, 2026, 10, 2, 16, 0, null);
            seedLocations(hafenRocker);
            seedLocations(lagerfeuer);
        }

        seedUsers();
    }

    private void seedUsers() {
        if (userService.findByEmail("organizer@gigflow.local").isEmpty()) {
            userService.register("organizer@gigflow.local", "organizer123", true);
            System.out.println("[gigflow] Demo-Organizer-Konto: organizer@gigflow.local / organizer123");
        }
        if (userService.findByEmail("musiker@gigflow.local").isEmpty()) {
            User user = userService.register("musiker@gigflow.local", "musiker1234", false);
            Musician musician = musicianService.createMusicianEntity("Demo", "Musiker", "Multi-Instrumentalist");
            userService.linkToMusician(user, musician);
            System.out.println("[gigflow] Demo-Musiker-Konto: musiker@gigflow.local / musiker1234");
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

    private Event event(String title, EventType type, Band band,
                       int year, int month, int day, int hour, int minute, Event concert) {
        Event event = new Event();
        event.setTitle(title);
        event.setType(type);
        event.setBand(band);
        event.setDateTime(LocalDateTime.of(year, month, day, hour, minute));
        event.setConcert(concert);
        return eventRepository.save(event);
    }

    private void seedLocations(Event concert) {
        if (eventLocationRepository.findByEventId(concert.getId()).isEmpty()) {
            location(concert, LocationType.VENUE, "Klangbar Hamburg",
                    "Reeperbahn 42, 20359 Hamburg",
                    "Backstage-Eingang hinter der Bühne", "+49 40 12345678",
                    "https://maps.google.com/?q=Klangbar+Hamburg");
            location(concert, LocationType.HOTEL, "Hotel Meeresblick",
                    "Stresemannstraße 120, 22769 Hamburg",
                    null, "+49 40 98765432", null);
            location(concert, LocationType.MEETING_POINT, "Treffpunkt Backstage",
                    "Reeperbahn 42, 20359 Hamburg",
                    "Treffen 2 h vor Soundcheck am Ladeeingang", null, null);
        }
    }

    private void location(Event concert, LocationType type, String name, String address,
                          String note, String phone, String mapsUrl) {
        EventLocation location = new EventLocation();
        location.setEvent(concert);
        location.setType(type);
        location.setName(name);
        location.setAddress(address);
        location.setNote(note);
        location.setPhone(phone);
        location.setMapsUrl(mapsUrl);
        eventLocationRepository.save(location);
    }
}
