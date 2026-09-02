import { ChangeDetectionStrategy, Component } from '@angular/core';

import { EventPrintComponent, type EventPrintData } from './event-print.component';

const DEMO_DATA: EventPrintData = {
  event: {
    id: 1,
    title: 'Sommernachts-Gig am Hafen',
    type: 'CONCERT',
    dateTime: '2026-09-12T20:00:00',
    bandName: 'The Dockyarders',
  },
  participations: [
    {
      id: 1,
      eventId: 1,
      musicianId: 1,
      status: 'ACCEPTED',
      musician: { id: 1, firstName: 'Ada', lastName: 'Lovelace', instrument: 'Gitarre & Gesang' },
    },
    {
      id: 2,
      eventId: 1,
      musicianId: 2,
      status: 'ACCEPTED',
      musician: { id: 2, firstName: 'Grace', lastName: 'Hopper', instrument: 'Bass' },
    },
    {
      id: 3,
      eventId: 1,
      musicianId: 3,
      status: 'ACCEPTED',
      musician: { id: 3, firstName: 'Linus', lastName: 'Torvalds', instrument: 'Schlagzeug' },
    },
    {
      id: 4,
      eventId: 1,
      musicianId: 4,
      status: 'INVITED',
      musician: { id: 4, firstName: 'Margaret', lastName: 'Hamilton', instrument: 'Keys & Sounds' },
    },
    {
      id: 5,
      eventId: 1,
      musicianId: 5,
      status: 'DECLINED',
      musician: { id: 5, firstName: 'Konrad', lastName: 'Zuse', instrument: 'Saxophon' },
    },
  ],
  rehearsals: [
    { id: 11, title: 'Generalprobe', type: 'REHEARSAL', dateTime: '2026-09-11T18:00:00' },
    { id: 12, title: 'Soundcheck-Probe', type: 'REHEARSAL', dateTime: '2026-09-09T19:30:00', bandId: 2 },
  ],
  entries: [
    { id: 1, setlistId: 10, pieceId: 1, pieceTitle: 'Hafenlichter', position: 0 },
    { id: 2, setlistId: 10, pieceId: 2, pieceTitle: 'Leinen los', position: 1 },
    { id: 3, setlistId: 10, pieceId: 3, pieceTitle: 'Mitternachtswelle', position: 2 },
    { id: 4, setlistId: 10, pieceId: 4, pieceTitle: 'Ankerplatz Blues', position: 3 },
    { id: 5, setlistId: 10, pieceId: 5, pieceTitle: 'Nordwind', position: 4 },
    { id: 6, setlistId: 10, pieceId: 6, pieceTitle: 'Zugabe: Heimathafen', position: 5 },
  ],
  requirements: [
    {
      id: 1,
      eventId: 1,
      equipmentId: 1,
      equipmentName: 'Schlagzeug',
      category: 'Drums',
      availableOnSite: 'YES',
      needsToBeBrought: 'NO',
      responsibleMusician: { id: 3, firstName: 'Linus', lastName: 'Torvalds' },
    },
    {
      id: 2,
      eventId: 1,
      equipmentId: 2,
      equipmentName: 'Verstärker (Gitarre)',
      category: 'Amp',
      availableOnSite: 'NO',
      needsToBeBrought: 'YES',
      responsibleMusician: { id: 1, firstName: 'Ada', lastName: 'Lovelace' },
    },
    {
      id: 3,
      eventId: 1,
      equipmentId: 3,
      equipmentName: 'Bass-Amp',
      category: 'Amp',
      availableOnSite: 'YES',
      needsToBeBrought: 'NO',
    },
    {
      id: 4,
      eventId: 1,
      equipmentId: 4,
      equipmentName: 'Keyboard inkl. Stativ',
      category: 'Keys',
      availableOnSite: 'UNKNOWN',
      needsToBeBrought: 'UNKNOWN',
      responsibleMusician: { id: 4, firstName: 'Margaret', lastName: 'Hamilton' },
    },
  ],
  scheduleItems: [
    { id: 1, eventId: 1, label: 'Aufbau', time: '15:00' },
    { id: 2, eventId: 1, label: 'Soundcheck', time: '18:00' },
    { id: 3, eventId: 1, label: 'Einlass', time: '19:30' },
    { id: 4, eventId: 1, label: 'Erstes Set', time: '21:00' },
    { id: 5, eventId: 1, label: 'Pause', time: '21:45' },
    { id: 6, eventId: 1, label: 'Zweites Set', time: '22:15' },
    { id: 7, eventId: 1, label: 'Abbau', time: '23:30' },
  ],
  locations: [
    {
      id: 1,
      eventId: 1,
      type: 'VENUE',
      name: 'Kulturfabrik am Hafen',
      address: 'Hafenstraße 12, 20457 Hamburg',
      note: 'Ladestrom hinter der Bühne vorhanden, Backline nicht inklusive.',
      phone: '040 123 4567',
      mapsUrl: 'https://maps.google.com/?q=Kulturfabrik+am+Hafen',
    },
    {
      id: 2,
      eventId: 1,
      type: 'HOTEL',
      name: 'Strandhotel Nord',
      address: 'Promenadenweg 3, 20459 Hamburg',
      note: 'Check-in ab 14:00, Frühstück ab 07:00.',
      phone: '040 987 6543',
      mapsUrl: null,
    },
    {
      id: 3,
      eventId: 1,
      type: 'RESTAURANT',
      name: 'Poseidon Fischbude',
      address: 'Dockstraße 8, 20095 Hamburg',
      note: 'Tisch für 8 Personen reserviert um 20:00.',
      phone: null,
      mapsUrl: null,
    },
    {
      id: 4,
      eventId: 1,
      type: 'MEETING_POINT',
      name: 'Backstage-Eingang',
      address: 'Hafenstraße 12 (Hofeinfahrt), 20457 Hamburg',
      note: 'Treffpunkt 14:30 Uhr fürs Team.',
      phone: null,
      mapsUrl: null,
    },
  ],
};

@Component({
  selector: 'app-event-print-demo',
  imports: [EventPrintComponent],
  template: `<app-event-print [data]="data" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventPrintDemoComponent {
  readonly data = DEMO_DATA;
}