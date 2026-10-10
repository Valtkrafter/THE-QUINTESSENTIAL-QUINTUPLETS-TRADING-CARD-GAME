import { useState, type ChangeEvent } from 'react';
import { CATALOG, SET_CODE } from '../cards/catalog';
import { artUrlFor } from '../cards/characterArt';
import { AFFINITY_INFO, CHARACTERS } from '../cards/characters';
import { RARITIES, SISTERS, SUPPORTING_CAST, type CardId, type CharacterId } from '../cards/model';

type CharacterFilter = CharacterId | 'all';

const FILTER_OPTIONS: readonly CharacterId[] = [...SISTERS, ...SUPPORTING_CAST];

function isCharacterFilter(value: string): value is CharacterFilter {
  return value === 'all' || FILTER_OPTIONS.some((id) => id === value);
}

export interface CardBrowserProps {
  readonly selectedId: CardId | null;
  readonly onSelect: (id: CardId) => void;
}

export function CardBrowser({ selectedId, onSelect }: CardBrowserProps) {
  const [filter, setFilter] = useState<CharacterFilter>('all');
  const cards = filter === 'all' ? CATALOG : CATALOG.filter((card) => card.character === filter);
  const selected = CATALOG.find((card) => card.id === selectedId) ?? null;
  const selectedRarity = RARITIES.find((rarity) => rarity.id === selected?.rarity);

  const handleFilter = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (isCharacterFilter(value)) {
      setFilter(value);
    }
  };

  return (
    <section className="panel__section">
      <h2>
        Cards · {SET_CODE} ({CATALOG.length})
      </h2>
      <label className="field">
        <span className="field__label">Character</span>
        <select value={filter} onChange={handleFilter}>
          <option value="all">All characters</option>
          {FILTER_OPTIONS.map((id) => (
            <option key={id} value={id}>
              {CHARACTERS[id].name.en} · {CHARACTERS[id].name.ja}
            </option>
          ))}
        </select>
      </label>
      <div className="art-grid">
        {cards.map((card) => {
          const url = artUrlFor(card.art);
          const accent = AFFINITY_INFO[card.kind === 'character' ? card.affinity : 'study'].color;
          return (
            <button
              key={card.id}
              type="button"
              className="art-thumb"
              aria-pressed={card.id === selectedId}
              title={`${card.name.en} — ${card.title} (${card.rarity})`}
              style={{ borderColor: card.id === selectedId ? undefined : `${accent}55` }}
              onClick={() => onSelect(card.id)}
            >
              {url === null ? <span className="art-thumb__missing">no art</span> : <img src={url} alt={card.title} />}
              <span className="art-thumb__badge">{card.rarity}</span>
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <p className="hint">
          <strong>{selected.name.en}</strong> · “{selected.title}” · {selectedRarity?.label ?? selected.rarity}
          {selected.kind === 'character' ? ` · ${selected.stage}${selected.prime ? ' · Prime' : ''}` : ' · Supporter'}
        </p>
      )}
    </section>
  );
}
