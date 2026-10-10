import { useRef, useState, type DragEvent } from 'react';
import { addFilesToLibrary, loadFolderLibrary, type ArtLibrary } from '../../cards/artLibrary';
import { CATALOG } from '../../cards/catalog';
import type { CardId } from '../../cards/model';
import type { Selection } from '../../cards/selection';
import type { FinishId } from '../../holo/finishes';
import { DEFAULT_SETTINGS, type HoloSettings, type ViewMode } from '../../holo/settings';
import { Stage, type FaceSource } from '../../scene/Stage';
import './lab.css';
import { ControlPanel } from './ControlPanel';

export default function HoloLab() {
  const [mode, setMode] = useState<ViewMode>('gallery');
  const [finishId, setFinishId] = useState<FinishId>('rainbow');
  const [settings, setSettings] = useState<HoloSettings>(DEFAULT_SETTINGS);
  const [library, setLibrary] = useState<ArtLibrary>(loadFolderLibrary);
  const [selection, setSelection] = useState<Selection | null>(() => {
    const first = CATALOG[0];
    return first === undefined ? null : { kind: 'card', id: first.id };
  });
  const [flipRequest, setFlipRequest] = useState(0);
  const [gpuName, setGpuName] = useState('Wird erkannt …');
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fpsRef = useRef<HTMLSpanElement>(null);

  const selectedCard = selection?.kind === 'card' ? (CATALOG.find((card) => card.id === selection.id) ?? null) : null;
  const selectedArt = selection?.kind === 'art' ? (library.arts.find((art) => art.id === selection.id) ?? null) : null;
  const source: FaceSource =
    selectedCard !== null
      ? { kind: 'card', card: selectedCard }
      : selectedArt !== null
        ? { kind: 'art', artUrl: selectedArt.artUrl, maskUrl: selectedArt.maskUrl }
        : { kind: 'none' };

  const addFiles = (files: readonly File[]) => {
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) {
      return;
    }
    const update = addFilesToLibrary(library, images, selectedArt?.id ?? null);
    setLibrary(update.library);
    if (update.selectId !== null) {
      setSelection({ kind: 'art', id: update.selectId });
    }
  };

  const inspectFinish = (id: FinishId) => {
    setFinishId(id);
    setMode('inspect');
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingFiles(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.relatedTarget === null) {
      setIsDraggingFiles(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFiles(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="app lab" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <ControlPanel
        mode={mode}
        onModeChange={setMode}
        finishId={finishId}
        onFinishChange={inspectFinish}
        settings={settings}
        onSettingsChange={setSettings}
        library={library}
        selection={selection}
        hasCustomMask={selectedCard !== null || (selectedArt?.maskUrl ?? null) !== null}
        onSelectArt={(id: string) => setSelection({ kind: 'art', id })}
        onSelectCard={(id: CardId) => setSelection({ kind: 'card', id })}
        onAddFiles={addFiles}
        onFlip={() => setFlipRequest((count) => count + 1)}
        gpuName={gpuName}
        fpsRef={fpsRef}
      />
      <main className="stage">
        <Stage
          mode={mode}
          finishId={finishId}
          settings={settings}
          source={source}
          backUrl={library.backUrl}
          flipRequest={flipRequest}
          onSelectFinish={inspectFinish}
          onGpuDetected={setGpuName}
          fpsRef={fpsRef}
        />
        <p className="stage__hint">
          {mode === 'gallery' ? 'Fahr über eine Karte, um sie zu kippen. Klick zum Ansehen.' : 'Ziehen zum Drehen. Doppelklick zum Umdrehen.'}
        </p>
        {isDraggingFiles && <div className="drop-overlay">Bilder hier loslassen</div>}
      </main>
    </div>
  );
}
