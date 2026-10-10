// Every sentence the screens show, in one place and in one language (German). Stage 7 turns this file into a set of
// languages; until then no screen writes its own text. Card names, rarities and finish names are game terms and stay in
// English, like the cards themselves.

import type { FrameStyle } from '../cards/frameStyle';
import type { SortKey } from '../domain/collection';
import type { GraphicsLevel } from '../state/preferences';

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export const text = {
  appName: 'TQQ',
  appTagline: 'Sammelkartenspiel',
  loading: 'Wird geladen …',
  back: 'Zurück',

  nav: {
    binder: 'Sammelmappe',
    dex: 'Card-Dex',
    showcase: 'Vitrine',
    settings: 'Einstellungen',
    lab: 'Holo-Labor',
    label: 'Hauptmenü',
  },

  status: {
    memoryOnly: 'Dein Browser erlaubt kein Speichern. Dein Fortschritt geht verloren, sobald du die Seite schließt.',
    writeFailed: 'Das Speichern hat gerade nicht geklappt. Das Spiel versucht es bei der nächsten Änderung noch einmal.',
  },

  damaged: {
    title: 'Dein Spielstand lässt sich nicht lesen',
    body: 'Es gibt einen gespeicherten Spielstand, aber er ist beschädigt oder unvollständig. Es wurde nichts überschrieben. Du kannst eine Kopie sichern und danach ein neues Spiel beginnen.',
    reason: 'Grund',
    download: 'Beschädigten Stand als Datei sichern',
    startOver: 'Neues Spiel beginnen',
    confirm: 'Der gespeicherte Stand wird gelöscht. Wirklich ein neues Spiel beginnen?',
    confirmYes: 'Ja, neu beginnen',
    cancel: 'Abbrechen',
  },

  binder: {
    title: 'Sammelmappe',
    summary: (copies: number, designs: number) => `${plural(copies, 'Karte', 'Karten')} · ${plural(designs, 'Motiv', 'Motive')}`,
    search: 'Karte suchen …',
    searchLabel: 'Karten durchsuchen',
    sort: 'Sortieren nach',
    sortOptions: {
      number: 'Nummer',
      rarity: 'Seltenheit',
      finish: 'Finish',
      newest: 'Neueste zuerst',
    } satisfies Record<SortKey, string>,
    filter: (active: number) => (active === 0 ? 'Filter' : `Filter (${active})`),
    filterCharacter: 'Figur',
    filterRarity: 'Seltenheit',
    filterFinish: 'Finish',
    filterReset: 'Filter zurücksetzen',
    emptyTitle: 'Deine Mappe ist noch leer',
    emptyBody: 'Hier landen alle Karten, die du bekommst. Packs zum Öffnen kommen im nächsten Bauabschnitt.',
    emptyDev: 'Zum Ausprobieren kannst du in den Einstellungen Testkarten holen.',
    emptyDevAction: 'Zu den Einstellungen',
    noMatch: 'Keine Karte passt zu diesen Filtern.',
    copyOf: (serial: number) => `Kopie ${serial}`,
  },

  dex: {
    title: 'Card-Dex',
    summary: (found: number, total: number) => `${found} von ${total} Motiven gefunden`,
    unknown: 'Noch nicht gefunden',
    owned: (count: number) => (count > 1 ? `×${count}` : ''),
    progress: (found: number, total: number) => `${found}/${total}`,
  },

  inspect: {
    back: 'Sammelmappe',
    flip: 'Umdrehen',
    hint: 'Ziehen zum Drehen · Doppelklick zum Umdrehen',
    addToShowcase: 'In die Vitrine stellen',
    removeFromShowcase: 'Aus der Vitrine nehmen',
    showcaseFull: 'Die Vitrine ist voll.',
    inShowcase: 'In deiner Vitrine',
    number: 'Kartennummer',
    copy: 'Kopie',
    copyValue: (serial: number) => `Nr. ${serial} dieses Motivs`,
    finish: 'Finish',
    rarity: 'Seltenheit',
    kind: 'Art',
    hp: 'Lebenspunkte',
    obtained: 'Erhalten',
    obtainedVia: { starter: 'Startkarte', pack: 'aus einem Pack', shop: 'im Laden gekauft', reward: 'als Belohnung' },
    condition: 'Zustand',
    conditionUnknown: 'Noch nicht bewertet. Das Bewertungsbüro kommt in einem späteren Bauabschnitt.',
    missing: 'Diese Karte gibt es nicht (mehr).',
    noWebgl: 'Die 3D-Ansicht lässt sich auf diesem Gerät nicht starten. Hier siehst du die Karte flach.',
    preparing: 'Karte wird gemalt …',
    character: 'Figur',
    supporter: 'Unterstützer',
    stage: { basic: 'Basic', close: 'Close', bride: 'Bride', event: 'Event' },
    prime: 'Prime',
    limited: 'Begrenzt',
  },

  showcase: {
    title: 'Vitrine',
    summary: (used: number, slots: number) => `Zeig hier deine liebsten Karten · ${used} von ${slots} Plätzen belegt`,
    empty: 'Frei',
    choose: 'Karte wählen',
    remove: 'Entfernen',
    pickerTitle: 'Karte für die Vitrine wählen',
    pickerEmpty: 'Du hast noch keine Karte, die du ausstellen könntest.',
    pickerAllShown: 'Alle deine Karten stehen schon in der Vitrine.',
    close: 'Schließen',
    nothingYet: 'Deine Vitrine ist noch leer. Sobald du Karten hast, kannst du hier bis zu sechs davon ausstellen.',
  },

  settings: {
    title: 'Einstellungen',
    look: 'Aussehen',
    frame: 'Kartenrahmen',
    frameHint: 'So sehen alle Karten aus. Das ändert nur die Darstellung, nicht die Karten selbst.',
    frameNames: { classic: 'Klassisch', paper: 'Papier', fade: 'Verlauf', glass: 'Glas' } satisfies Record<FrameStyle, string>,
    graphics: 'Grafik',
    graphicsHint: 'Niedriger zeichnet die 3D-Karte weniger scharf. Das schont Akku und schwächere Grafikkarten.',
    graphicsNames: { high: 'Hoch', normal: 'Mittel', low: 'Niedrig' } satisfies Record<GraphicsLevel, string>,
    idleMotion: 'Karten schweben sanft, wenn du sie nicht anfasst',
    saveGame: 'Spielstand',
    saveHint: 'Dein Spielstand liegt in diesem Browser auf diesem Gerät. Mit einer Sicherung kannst du ihn mitnehmen oder wiederherstellen.',
    export: 'Sicherung herunterladen',
    import: 'Sicherung laden …',
    importConfirm: (copies: number, yen: number) =>
      `Diese Sicherung enthält ${plural(copies, 'Karte', 'Karten')} und ¥${yen.toLocaleString('de-DE')}. Dein aktueller Spielstand wird dadurch ersetzt.`,
    importYes: 'Ersetzen',
    importFailed: 'Die Datei konnte nicht geladen werden',
    reset: 'Neues Spiel beginnen',
    resetConfirm: 'Alle Karten, dein Geld und deine Vitrine werden gelöscht. Das lässt sich nicht rückgängig machen.',
    resetYes: 'Ja, alles löschen',
    cancel: 'Abbrechen',
    developer: 'Entwicklung',
    developerHint: 'Gibt es nur in der Entwicklungsversion, bis die Packs fertig sind.',
    grantRandom: '12 Testkarten holen',
    grantSet: 'Das ganze Set holen',
    granted: (count: number) => `${plural(count, 'Karte', 'Karten')} hinzugefügt`,
    about: 'Über dieses Spiel',
    aboutBody: 'Ein Fan-Projekt zu „Die Quintessenz der Fünflinge“. Kostenlos, ohne echtes Geld, für immer.',
    lab: 'Holo-Labor öffnen',
  },

  lab: { back: 'Zurück zum Spiel' },

  crash: {
    title: 'Hier ist etwas schiefgegangen',
    body: 'Die Anzeige ist abgestürzt. Dein Spielstand ist nicht betroffen.',
    reload: 'Seite neu laden',
  },
} as const;
