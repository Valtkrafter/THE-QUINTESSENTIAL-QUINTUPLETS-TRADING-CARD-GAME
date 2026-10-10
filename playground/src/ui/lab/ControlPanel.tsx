import { useRef, type ChangeEvent, type RefObject } from 'react';
import type { CardId } from '../../cards/model';
import type { Selection } from '../../cards/selection';
import { CardBrowser } from './CardBrowser';
import type { ArtLibrary } from '../../cards/artLibrary';
import { hasFrame } from '../../holo/frames';
import { FINISHES, LAYOUT_MASK_MODES, MASK_MODES, findFinish, isMaskSetting, type FinishId } from '../../holo/finishes';
import type { FrameStyle, HoloSettings, ViewMode } from '../../holo/settings';

const FRAME_STYLES: readonly { readonly id: FrameStyle; readonly label: string; readonly description: string }[] = [
  { id: 'classic', label: 'Classic', description: 'Weiß Schwarz look: pearl border, white level box, translucent text box, name band and trait strip.' },
  { id: 'paper', label: 'Paper', description: 'Weiß-style: solid name bar on a cream text box, hexagon level badge, outlined HP.' },
  { id: 'fade', label: 'Fade', description: 'Minimal: no boxes. Text sits on a dark fade at the bottom, gold-ring badge.' },
  { id: 'glass', label: 'Glass', description: 'The previous frosted-glass panels, kept for comparison.' },
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
        <h1>Holo Playground</h1>
        <p>WebGL foil finishes for the TQQ card game.</p>
      </header>

      <section className="panel__section">
        <h2>View</h2>
        <div className="segmented" role="group" aria-label="View mode">
          <button type="button" aria-pressed={mode === 'gallery'} onClick={() => onModeChange('gallery')}>
            All finishes
          </button>
          <button type="button" aria-pressed={mode === 'inspect'} onClick={() => onModeChange('inspect')}>
            Inspect one
          </button>
        </div>
      </section>

      <section className="panel__section">
        <h2>Finish</h2>
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
          {mode === 'inspect' ? activeFinish.description : 'Click a card or a finish to inspect it up close.'}
        </p>
      </section>

      <section className="panel__section">
        <h2>Foil</h2>
        <label className="field">
          <span className="field__label">Foil region</span>
          <select value={settings.maskSetting} onChange={handleMaskChange}>
            <option value="auto">Per finish (default)</option>
            {MASK_MODES.filter((maskMode) => !LAYOUT_MASK_MODES.has(maskMode.id) && (maskMode.id !== 'frame' || hasFrame(settings.frameStyle))).map((maskMode) => {
              const unavailable = maskMode.id === 'custom' && !hasCustomMask;
              return (
                <option key={maskMode.id} value={maskMode.id} disabled={unavailable}>
                  {unavailable ? `${maskMode.label} (no mask loaded)` : maskMode.label}
                </option>
              );
            })}
          </select>
        </label>
        {settings.maskSetting === 'custom' && !hasCustomMask && (
          <p className="hint">This art has no mask, so no foil is shown. Add a matching name.mask.png.</p>
        )}
        <Slider label="Intensity" min={0} max={2} step={0.05} value={settings.intensity} onChange={(value) => update('intensity', value)} />
        <Slider label="Glare" min={0} max={1.5} step={0.05} value={settings.glare} onChange={(value) => update('glare', value)} />
        <Slider label="Tilt" min={0} max={2} step={0.05} value={settings.tilt} onChange={(value) => update('tilt', value)} />
        <Toggle
          label="Light follows pointer"
          checked={settings.lightFollowsPointer}
          onChange={(checked) => update('lightFollowsPointer', checked)}
        />
        <Toggle label="Idle motion" checked={settings.idleMotion} onChange={(checked) => update('idleMotion', checked)} />
      </section>

      {mode === 'inspect' && (
        <section className="panel__section">
          <h2>Card</h2>
          <button type="button" className="button" onClick={onFlip}>
            Flip card
          </button>
          <p className="hint">Drag sideways to spin. Double-click to flip.</p>
        </section>
      )}

      <section className="panel__section">
        <h2>Card frame</h2>
        <div className="segmented segmented--grid" role="group" aria-label="Card frame style">
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
        <h2>Art</h2>
        <div className="segmented" role="group" aria-label="Art fit">
          <button type="button" aria-pressed={settings.artFit === 'cover'} onClick={() => update('artFit', 'cover')}>
            Fill card
          </button>
          <button type="button" aria-pressed={settings.artFit === 'contain'} onClick={() => update('artFit', 'contain')}>
            Whole image
          </button>
        </div>
        {settings.artFit === 'cover' && (
          <Slider
            label="Crop position (top → bottom)"
            min={0}
            max={1}
            step={0.01}
            value={settings.artFocus}
            onChange={(value) => update('artFocus', value)}
          />
        )}
        {library.arts.length === 0 ? (
          <p className="hint">No raw images yet. Drop some to test finishes on art without a card frame.</p>
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
                {art.maskUrl !== null && <span className="art-thumb__badge">mask</span>}
              </button>
            ))}
          </div>
        )}
        <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>
          Add images…
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFilesPicked} />
        <p className="hint">
          Drop files anywhere on the page. <code>name.mask.png</code> is a foil mask (white = foil) and{' '}
          <code>back.png</code> replaces the card back. Files in <code>src/assets/cards/</code> load on start.
        </p>
        {library.backUrl !== null && <p className="hint">Custom card back loaded.</p>}
      </section>

      <footer className="panel__perf">
        <div>
          <span>Frame rate</span>
          <span ref={fpsRef}>–</span>
        </div>
        <div>
          <span>GPU</span>
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
