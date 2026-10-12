import { CHARACTERS } from '../../cards/characters';
import { FINISH_IDS, type FinishId } from '../../cards/finish';
import { CHARACTER_IDS, RARITIES, type CharacterId, type Rarity } from '../../cards/model';
import { GRADING_STATES, NO_FILTER, activeFilterCount, type CollectionFilter } from '../../domain/collection';
import { findFinish } from '../../holo/finishes';
import { Button, Chip } from '../components/controls';
import { affinityColor } from '../finishStyle';
import { text } from '../text';
import styles from './BinderScreen.module.css';

function toggled<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

export interface FilterPanelProps {
  readonly filter: CollectionFilter;
  readonly onChange: (filter: CollectionFilter) => void;
}

export function FilterPanel({ filter, onChange }: FilterPanelProps) {
  return (
    <section className={styles.panel} aria-label={text.binder.filter(0)} data-tutorial="binder-panel">
      <div className={styles.group}>
        <h3>{text.binder.filterCharacter}</h3>
        <div className={styles.chips}>
          {CHARACTER_IDS.map((id: CharacterId) => (
            <Chip
              key={id}
              color={affinityColor(CHARACTERS[id].affinity)}
              pressed={filter.characters.includes(id)}
              onToggle={() => onChange({ ...filter, characters: toggled(filter.characters, id) })}
            >
              {CHARACTERS[id].name.en.split(' ')[0]}
            </Chip>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <h3>{text.binder.filterRarity}</h3>
        <div className={styles.chips} data-tutorial="filter-rarity">
          {RARITIES.map((rarity) => (
            <Chip
              key={rarity.id}
              pressed={filter.rarities.includes(rarity.id)}
              onToggle={() => onChange({ ...filter, rarities: toggled<Rarity>(filter.rarities, rarity.id) })}
            >
              {rarity.id}
            </Chip>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <h3>{text.binder.filterFinish}</h3>
        <div className={styles.chips}>
          {FINISH_IDS.map((id: FinishId) => (
            <Chip key={id} pressed={filter.finishes.includes(id)} onToggle={() => onChange({ ...filter, finishes: toggled(filter.finishes, id) })}>
              {findFinish(id).label}
            </Chip>
          ))}
        </div>
      </div>
      <div className={styles.group}>
        <h3>{text.binder.filterGrading}</h3>
        <div className={styles.chips}>
          {GRADING_STATES.map((state) => (
            <Chip key={state} pressed={filter.grading.includes(state)} onToggle={() => onChange({ ...filter, grading: toggled(filter.grading, state) })}>
              {text.binder.gradingOptions[state]}
            </Chip>
          ))}
        </div>
      </div>
      {activeFilterCount(filter) > 0 && (
        <div className={styles.reset}>
          <Button kind="quiet" onClick={() => onChange(NO_FILTER)} data-tutorial="filter-reset">
            {text.binder.filterReset}
          </Button>
        </div>
      )}
    </section>
  );
}
