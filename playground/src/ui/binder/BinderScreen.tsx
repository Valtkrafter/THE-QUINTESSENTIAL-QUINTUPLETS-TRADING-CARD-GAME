import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useSave } from '../../state/app';
import { activeFilterCount, filterCollection, NO_FILTER, sortCollection, type CollectionFilter, type SortKey } from '../../domain/collection';
import { CardTile } from '../components/CardTile';
import { Button, SearchField, SelectField } from '../components/controls';
import { FilterIcon, SearchIcon } from '../components/icons';
import { EmptyState, PageHeader } from '../components/PageHeader';
import { text } from '../text';
import { FilterPanel } from './FilterPanel';
import styles from './BinderScreen.module.css';

const SORT_OPTIONS: readonly { readonly value: SortKey; readonly label: string }[] = [
  { value: 'number', label: text.binder.sortOptions.number },
  { value: 'rarity', label: text.binder.sortOptions.rarity },
  { value: 'finish', label: text.binder.sortOptions.finish },
  { value: 'newest', label: text.binder.sortOptions.newest },
];

export default function BinderScreen() {
  const { collection } = useSave();
  const [filter, setFilter] = useState<CollectionFilter>(NO_FILTER);
  const [sort, setSort] = useState<SortKey>('number');
  const [panelOpen, setPanelOpen] = useState(false);

  const shown = useMemo(() => sortCollection(filterCollection(collection, filter), sort), [collection, filter, sort]);
  const designs = useMemo(() => new Set(collection.map((copy) => copy.cardId)).size, [collection]);
  const active = activeFilterCount(filter);

  if (collection.length === 0) {
    return (
      <>
        <PageHeader title={text.binder.title} />
        <EmptyState title={text.binder.emptyTitle}>
          <p>{text.binder.emptyBody}</p>
          {import.meta.env.DEV && (
            <p>
              {text.binder.emptyDev} <Link href="/settings">{text.binder.emptyDevAction}</Link>
            </p>
          )}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title={text.binder.title} subtitle={text.binder.summary(collection.length, designs)} />
      <div className={styles.toolbar}>
        <SearchField
          value={filter.query}
          onChange={(query) => setFilter({ ...filter, query })}
          placeholder={text.binder.search}
          label={text.binder.searchLabel}
          icon={<SearchIcon size={16} />}
        />
        <Button onClick={() => setPanelOpen(!panelOpen)} aria-expanded={panelOpen}>
          <FilterIcon size={16} />
          {text.binder.filter(active)}
        </Button>
        <SelectField value={sort} options={SORT_OPTIONS} onChange={setSort} label={text.binder.sort} />
      </div>
      {panelOpen && <FilterPanel filter={filter} onChange={setFilter} />}
      {shown.length === 0 ? (
        <p className={styles.none}>{text.binder.noMatch}</p>
      ) : (
        <ul className={styles.grid}>
          {shown.map((copy) => (
            <CardTile key={copy.uid} copy={copy} href={`/card/${copy.uid}`} />
          ))}
        </ul>
      )}
    </>
  );
}
