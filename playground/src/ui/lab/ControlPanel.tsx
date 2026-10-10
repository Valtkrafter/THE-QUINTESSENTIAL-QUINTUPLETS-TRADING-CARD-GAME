import { useRef, type ChangeEvent, type RefObject } from 'react';
import type { CardId } from '../../cards/model';
import type { Selection } from '../../cards/selection';
import { CardBrowser } from './CardBrowser';
import type { ArtLibrary } from '../../cards/artLibrary';
import { hasFrame } from '../../holo/frames';
import { FINISHES, LAYOUT_MASK_MODES, MASK_MODES, findFinish, isMaskSetting, type FinishId } from '../../holo/finishes';
import type { FrameStyle, HoloSettings, ViewMode } from '../../holo/settings';

const FRAME_STYLES: readonly { readonly id: FrameStyle; readonly label: string; readonly description: string }[] = [
  { id: 'classic', label: 'Klassisch', description: 'Weiß-Schwarz-Look: Perlrand, weißes Stufenfeld, durchscheinende Textbox, Namensband und Merkmalsleiste.' },
  { id: 'paper', label: 'Papier', description: 'Papierlook: kräftiges Namensband auf cremefarbener Textbox, sechseckiges Stufenzeichen, umrandete LP.' },
  { id: 'fade', label: 'Verlauf', description: 'Schlicht: keine Kästen. Der Text liegt unten auf einem dunklen Verlauf, dazu ein Ringschild.' },
  { id: 'glass', label: 'Glas', description: 'Die frühere Milchglas-Gestaltung, zum Vergleichen aufgehoben.' },
];

export interface ControlPanelProps {
  readonly mode: ViewMode;
  readonly onModeChange: (mode: ViewMode) => void;
  readonly finishId: FinishId;
  readonly onFinishChange: (id: FinishId) => void;
  readonly settings: HoloSettings;
  readonly onSettingsChange: (settings: HoloSettings) => void;
  readonly library: ArtLibrary;
  readonly selection: Selection | null;
  /** Whether the selected art has a `.mask` image, which the custom foil region needs. */
  readonly hasCustomMask: boolean;
  readonly onSelectArt: (id: string) => void;
  readonly onSelectCard: (id: CardId) => void;
  readonly onAddFiles: (files: readonly File[]) => void;
  readonly onFlip: () => void;
  readonly gpuName: string;
  readonly fpsRef: RefObject<HTMLSpanElement | null>;
}

export function ControlPanel({
  mode,
  onModeChange,
  finishId,
  onFinishChange,
  settings,
  onSettingsChange,
  library,
  selection,
  hasCustomMask,
  onSelectArt,
  onSelectCard,
  onAddFiles,
  onFlip,
  gpuName,
  fpsRef,
}: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFinish = findFinish(finishId);

  function update<K extends keyof HoloSettings>(key: K, value: HoloSettings[K]): void {
    onSettingsChange({ ...settings, [key]: value });
  }

  const handleMaskChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (isMaskSetting(value)) {
      update('maskSetting', value);
    }
  };

  const handleFilesPicked = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files !== null) {
      onAddFiles(Array.from(files));
    }
    event.target.value = '';
  };

  return (
    <aside className="panel">
      <header className="panel__header">
        <h1>Holo-Labor</h1>
        <p>WebGL-Folienschimmer für das TQQ-Kartenspiel.</p>
      </header>

      <section className="panel__section">
        <h2>Ansicht</h2>
        <div className="segmented" role="group" aria-label="Ansichtsart">
          <button type="button" aria-pressed={mode === 'gallery'} onClick={() => onModeChange('gallery')}>
            Alle Schimmer
          </button>
          <button type="button" aria-pressed={mode === 'inspect'} onClick={() => onModeChange('inspect')}>
            Eine genau ansehen
          </button>
        </div>
      </section>

      <section className="panel__section">
        <h2>Schimmer</h2>
        <div className="chips">
          {FINISHES.map((finish) => (
            <button
              key={finish.id}
              type="button"
              className="chip"
              aria-pressed={mode === 'inspect' && finish.id === finishId}
              onClick={() => onFinishChange(finish.id)}
            >
              {finish.label}
            </button>
          ))}
        </div>
        <p className="hint">
          {mode === 'inspect' ? activeFinish.description : 'Klick auf eine Karte oder einen Schimmer, um ihn aus der Nähe zu sehen.'}
        </p>
      </section>

      <section className="panel__section">
        <h2>Folie</h2>
        <label className="field">
          <span className="field__label">Folienbereich</span>
          <select value={settings.maskSetting} onChange={handleMaskChange}>
            <option value="auto">Je nach Schimmer (Standard)</option>
            {MASK_MODES.filter((maskMode) => !LAYOUT_MASK_MODES.has(maskMode.id) && (maskMode.id !== 'frame' || hasFrame(settings.frameStyle))).map((maskMode) => {
              const unavailable = maskMode.id === 'custom' && !hasCustomMask;
              return (
                <option key={maskMode.id} value={maskMode.id} disabled={unavailable}>
                  {unavailable ? `${maskMode.label} (keine Maske geladen)` : maskMode.label}
                </option>
              );
            })}
          </select>
        </label>
        {settings.maskSetting === 'custom' && !hasCustomMask && (
          <p className="hint">Dieses Bild hat keine Maske, deshalb gibt es keine Folie. Lege eine passende name.mask.png dazu.</p>
        )}
        <Slider label="Stärke" min={0} max={2} step={0.05} value={settings.intensity} onChange={(value) => update('intensity', value)} />
        <Slider label="Glanzlicht" min={0} max={1.5} step={0.05} value={settings.glare} onChange={(value) => update('glare', value)} />
        <Slider label="Neigung" min={0} max={2} step={0.05} value={settings.tilt} onChange={(value) => update('tilt', value)} />
        <Toggle
          label="Licht folgt dem Zeiger"
          checked={settings.lightFollowsPointer}
          onChange={(checked) => update('lightFollowsPointer', checked)}
        />
        <Toggle label="Sanftes Schweben" checked={settings.idleMotion} onChange={(checked) => update('idleMotion', checked)} />
      </section>

      {mode === 'inspect' && (
        <section className="panel__section">
          <h2>Karte</h2>
          <button type="button" className="button" onClick={onFlip}>
            Karte umdrehen
          </button>
          <p className="hint">Seitlich ziehen zum Drehen. Doppelklick zum Umdrehen.</p>
        </section>
      )}

      <section className="panel__section">
        <h2>Kartenrahmen</h2>
        <div className="segmented segmented--grid" role="group" aria-label="Rahmenart">
          {FRAME_STYLES.map((style) => (
            <button key={style.id} type="button" aria-pressed={settings.frameStyle === style.id} onClick={() => update('frameStyle', style.id)}>
              {style.label}
            </button>
          ))}
        </div>
        <p className="hint">{FRAME_STYLES.find((style) => style.id === settings.frameStyle)?.description}</p>
      </section>

      <CardBrowser selectedId={selection?.kind === 'card' ? selection.id : null} onSelect={onSelectCard} />

      <section className="panel__section">
        <h2>Bild</h2>
        <div className="segmented" role="group" aria-label="Bildausschnitt">
          <button type="button" aria-pressed={settings.artFit === 'cover'} onClick={() => update('artFit', 'cover')}>
            Karte füllen
          </button>
          <button type="button" aria-pressed={settings.artFit === 'contain'} onClick={() => update('artFit', 'contain')}>
            Ganzes Bild
          </button>
        </div>
        {settings.artFit === 'cover' && (
          <Slider
            label="Ausschnitt (oben → unten)"
            min={0}
            max={1}
            step={0.01}
            value={settings.artFocus}
            onChange={(value) => update('artFocus', value)}
          />
        )}
        {library.arts.length === 0 ? (
          <p className="hint">Noch keine eigenen Bilder. Zieh welche hinein, um Schimmer auf Bildern ohne Kartenrahmen zu testen.</p>
        ) : (
          <div className="art-grid">
            {library.arts.map((art) => (
              <button
                key={art.id}
                type="button"
                className="art-thumb"
                aria-pressed={selection?.kind === 'art' && art.id === selection.id}
                title={art.name}
                onClick={() => onSelectArt(art.id)}
              >
                <img src={art.artUrl} alt={art.name} />
                {art.maskUrl !== null && <span className="art-thumb__badge">Maske</span>}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>
          Bilder hinzufügen …
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFilesPicked} />
        <p className="hint">
          Zieh Dateien irgendwo auf die Seite. <code>name.mask.png</code> ist eine Folienmaske (Weiß = Folie),{' '}
          <code>back.png</code> ersetzt die Kartenrückseite. Dateien in <code>src/assets/cards/</code> werden beim Start geladen.
        </p>
        {library.backUrl !== null && <p className="hint">Eigene Kartenrückseite geladen.</p>}
      </section>

      <footer className="panel__perf">
        <div>
          <span>Bilder pro Sekunde</span>
          <span ref={fpsRef}>–</span>
        </div>
        <div>
          <span>Grafikchip</span>
          <span className="panel__gpu" title={gpuName}>
            {gpuName}
          </span>
        </div>
      </footer>
    </aside>
  );
}

interface SliderProps {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  readonly onChange: (value: number) => void;
}

function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        <output>{value.toFixed(2)}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

interface ToggleProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
