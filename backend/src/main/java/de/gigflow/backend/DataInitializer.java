package de.gigflow.backend;

import de.gigflow.backend.band.Band;
import de.gigflow.backend.band.BandMembership;
import de.gigflow.backend.band.BandMembershipRepository;
import de.gigflow.backend.band.BandRepository;
import de.gigflow.backend.equipment.Equipment;
import de.gigflow.backend.equipment.EquipmentRepository;
import de.gigflow.backend.equipment.EquipmentRequirement;
import de.gigflow.backend.equipment.EquipmentRequirementRepository;
import de.gigflow.backend.equipment.RequirementState;
import de.gigflow.backend.event.Event;
import de.gigflow.backend.event.EventParticipation;
import de.gigflow.backend.event.EventParticipationRepository;
import de.gigflow.backend.event.EventParticipationStatus;
import de.gigflow.backend.event.EventRepository;
import de.gigflow.backend.event.EventType;
import de.gigflow.backend.location.EventLocation;
import de.gigflow.backend.location.EventLocationRepository;
import de.gigflow.backend.location.LocationType;
import de.gigflow.backend.musician.Musician;
import de.gigflow.backend.musician.MusicianService;
import de.gigflow.backend.schedule.ScheduleItem;
import de.gigflow.backend.schedule.ScheduleItemRepository;
import de.gigflow.backend.setlist.Piece;
import de.gigflow.backend.setlist.PieceRepository;
import de.gigflow.backend.setlist.Setlist;
import de.gigflow.backend.setlist.SetlistEntry;
import de.gigflow.backend.setlist.SetlistEntryRepository;
import de.gigflow.backend.setlist.SetlistRepository;
import de.gigflow.backend.user.User;
import de.gigflow.backend.user.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
public class DataInitializer implements CommandLineRunner {

    private final BandRepository bandRepository;
    private final BandMembershipRepository bandMembershipRepository;
    private final EventRepository eventRepository;
    private final EventParticipationRepository eventParticipationRepository;
    private final EventLocationRepository eventLocationRepository;
    private final ScheduleItemRepository scheduleItemRepository;
    private final SetlistRepository setlistRepository;
    private final SetlistEntryRepository setlistEntryRepository;
    private final PieceRepository pieceRepository;
    private final EquipmentRepository equipmentRepository;
    private final EquipmentRequirementRepository equipmentRequirementRepository;
    private final UserService userService;
    private final MusicianService musicianService;

    public DataInitializer(BandRepository bandRepository,
                           BandMembershipRepository bandMembershipRepository,
                           EventRepository eventRepository,
                           EventParticipationRepository eventParticipationRepository,
                           EventLocationRepository eventLocationRepository,
                           ScheduleItemRepository scheduleItemRepository,
                           SetlistRepository setlistRepository,
                           SetlistEntryRepository setlistEntryRepository,
                           PieceRepository pieceRepository,
                           EquipmentRepository equipmentRepository,
                           EquipmentRequirementRepository equipmentRequirementRepository,
                           UserService userService,
                           MusicianService musicianService) {
        this.bandRepository = bandRepository;
        this.bandMembershipRepository = bandMembershipRepository;
        this.eventRepository = eventRepository;
        this.eventParticipationRepository = eventParticipationRepository;
        this.eventLocationRepository = eventLocationRepository;
        this.scheduleItemRepository = scheduleItemRepository;
        this.setlistRepository = setlistRepository;
        this.setlistEntryRepository = setlistEntryRepository;
        this.pieceRepository = pieceRepository;
        this.equipmentRepository = equipmentRepository;
        this.equipmentRequirementRepository = equipmentRequirementRepository;
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

        seedRichDemoGig(band);
        seedUsers();
    }

    private void seedRichDemoGig(Band band) {
        boolean alreadySeeded = eventRepository.findAll().stream()
                .anyMatch(e -> "Streifzug durch die Nacht".equals(e.getTitle()));
        if (alreadySeeded) {
            return;
        }

        Event gig = event("Streifzug durch die Nacht", EventType.CONCERT, band, 2026, 11, 21, 20, 0, null);
        event("Generalprobe Streifzug", EventType.REHEARSAL, band, 2026, 11, 20, 16, 0, gig);
        event("Soundcheck-Probe Streifzug", EventType.REHEARSAL, band, 2026, 11, 21, 16, 30, gig);

        Musician anna = musicianService.createMusicianEntity("Anna", "Becker", "Gesang");
        Musician ben = musicianService.createMusicianEntity("Ben", "Krüger", "Gitarre");
        Musician caro = musicianService.createMusicianEntity("Caro", "Mertens", "Bass");
        Musician david = musicianService.createMusicianEntity("David", "Olsen", "Schlagzeug");
        Musician elena = musicianService.createMusicianEntity("Elena", "Reis", "Klavier");
        Musician felix = musicianService.createMusicianEntity("Felix", "Brandt", "Saxophon");

        bandMembership(band, anna);
        bandMembership(band, ben);
        bandMembership(band, caro);
        bandMembership(band, david);
        bandMembership(band, elena);
        bandMembership(band, felix);

        participation(gig, anna, EventParticipationStatus.ACCEPTED);
        participation(gig, ben, EventParticipationStatus.ACCEPTED);
        participation(gig, caro, EventParticipationStatus.ACCEPTED);
        participation(gig, david, EventParticipationStatus.ACCEPTED);
        participation(gig, elena, EventParticipationStatus.INVITED);
        participation(gig, felix, EventParticipationStatus.DECLINED);

        scheduleItem(gig, "Aufbau", 14, 0);
        scheduleItem(gig, "Soundcheck", 16, 30);
        scheduleItem(gig, "Einlass", 19, 0);
        scheduleItem(gig, "Ansprache Backstage", 19, 45);
        scheduleItem(gig, "Erstes Set", 20, 0);
        scheduleItem(gig, "Pause", 20, 45);
        scheduleItem(gig, "Zweites Set", 21, 15);
        scheduleItem(gig, "Zugabe & Abbau", 22, 30);

        location(gig, LocationType.VENUE, "Hanseclub",
                "Feldstraße 60, 20359 Hamburg",
                "Backline teilweise vorhanden, Klavier auf der Bühne", "+49 40 313131",
                "https://maps.google.com/?q=Hanseclub+Hamburg");
        location(gig, LocationType.HOTEL, "City Hotel Hamburg",
                "Reeperbahn 15, 20359 Hamburg",
                "Check-in ab 13:00, Frühstück 6:30–10:00", "+49 40 5555555", null);
        location(gig, LocationType.RESTAURANT, "Lass mich rein!",
                "Kleiner Pulverteich 12, 20457 Hamburg",
                "Tisch für 8 Personen reserviert um 23:00", "+49 40 7777777", null);
        location(gig, LocationType.REHEARSAL_SPACE, "Proberaum Kellerclub",
                "Feldstraße 62, 20359 Hamburg",
                "Zugangscode 4213, Handtücher zum Fenster putzen bitte dabehalten", "+49 40 313132", null);

        Setlist setlist = new Setlist();
        setlist.setEvent(gig);
        setlistRepository.save(setlist);

        entry(setlist, piece("Fever"), 0);
        entry(setlist, piece("Piña Colada"), 1);
        entry(setlist, piece("Sway"), 2);
        entry(setlist, piece("La Vie en Rose"), 3);
        entry(setlist, piece("Fly Me to the Moon"), 4);
        entry(setlist, piece("Cheek to Cheek"), 5);

        Equipment keys = equipment("Keyboard", "Keys");
        Equipment bassAmp = equipment("Bass-Amp", "Amp");
        Equipment drumKit = equipment("Schlagzeug", "Drums");
        Equipment tenorSax = equipment("Saxophon (Tenor)", "Horn");
        Equipment mixer = equipment("Mischpult", "PA");

        requirement(gig, keys, RequirementState.NO, RequirementState.YES, elena);
        requirement(gig, bassAmp, RequirementState.YES, RequirementState.NO, null);
        requirement(gig, drumKit, RequirementState.YES, RequirementState.NO, null);
        requirement(gig, tenorSax, RequirementState.NO, RequirementState.YES, felix);
        requirement(gig, mixer, RequirementState.UNKNOWN, RequirementState.UNKNOWN, ben);
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

    private void participation(Event event, Musician musician, EventParticipationStatus status) {
        EventParticipation participation = new EventParticipation();
        participation.setEvent(event);
        participation.setMusician(musician);
        participation.setStatus(status);
        eventParticipationRepository.save(participation);
    }

    private void bandMembership(Band band, Musician musician) {
        if (bandMembershipRepository.existsByBandIdAndMusicianId(band.getId(), musician.getId())) {
            return;
        }
        BandMembership membership = new BandMembership();
        membership.setBand(band);
        membership.setMusician(musician);
        bandMembershipRepository.save(membership);
    }

    private void scheduleItem(Event event, String label, int hour, int minute) {
        ScheduleItem item = new ScheduleItem();
        item.setEvent(event);
        item.setLabel(label);
        item.setTime(LocalTime.of(hour, minute));
        scheduleItemRepository.save(item);
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

    private Piece piece(String title) {
        Piece piece = new Piece();
        piece.setTitle(title);
        return pieceRepository.save(piece);
    }

    private void entry(Setlist setlist, Piece piece, int position) {
        SetlistEntry entry = new SetlistEntry();
        entry.setSetlist(setlist);
        entry.setPiece(piece);
        entry.setPosition(position);
        setlistEntryRepository.save(entry);
    }

    private Equipment equipment(String name, String category) {
        Equipment equipment = new Equipment();
        equipment.setName(name);
        equipment.setCategory(category);
        return equipmentRepository.save(equipment);
    }

    private void requirement(Event event, Equipment equipment, RequirementState available,
                             RequirementState bring, Musician responsible) {
        EquipmentRequirement requirement = new EquipmentRequirement();
        requirement.setEvent(event);
        requirement.setEquipment(equipment);
        requirement.setAvailableOnSite(available);
        requirement.setNeedsToBeBrought(bring);
        requirement.setResponsibleMusician(responsible);
        equipmentRequirementRepository.save(requirement);
    }
}