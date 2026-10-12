import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { buildDex, dexProgress } from '../../domain/collection';
import { useBattle, useGame, usePreferences, useSave } from '../../state/app';
import { ProgressBar } from '../components/controls';
import { BattleIcon, BinderIcon, DecksIcon, DexIcon, GradingIcon, PacksIcon, SettingsIcon, ShopIcon, ShowcaseIcon } from '../components/icons';
import { cx, formatYen } from '../format';
import { text } from '../text';
import { TutorialHost } from '../tutorial/TutorialHost';
import { tutorialEnabled, useActiveTutorial } from '../tutorial/store';
import { isLocked, tabOf } from '../tutorial/tabs';
import styles from './AppShell.module.css';

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: ReactNode;
}

const NAV: readonly NavItem[] = [
  { href: '/packs', label: text.nav.packs, icon: <PacksIcon /> },
  { href: '/shop', label: text.nav.shop, icon: <ShopIcon /> },
  { href: '/', label: text.nav.binder, icon: <BinderIcon /> },
  { href: '/grading', label: text.nav.grading, icon: <GradingIcon /> },
  { href: '/battle', label: text.nav.battle, icon: <BattleIcon /> },
  { href: '/decks', label: text.nav.decks, icon: <DecksIcon /> },
  { href: '/dex', label: text.nav.dex, icon: <DexIcon /> },
  { href: '/showcase', label: text.nav.showcase, icon: <ShowcaseIcon /> },
  { href: '/settings', label: text.nav.settings, icon: <SettingsIcon /> },
];

const SISTER_DOTS = ['heart', 'butterfly', 'melody', 'clover', 'star'] as const;

function Brand() {
  return (
    <div className={styles.brand}>
      <span className={styles.hearts} aria-hidden="true">
        {SISTER_DOTS.map((affinity) => (
          <i key={affinity} style={{ background: `var(--affinity-${affinity})` }} />
        ))}
      </span>
      <strong className={styles.name}>{text.appName}</strong>
      <span className={styles.tagline}>{text.appTagline}</span>
    </div>
  );
}

/** The menu entry a page belongs to (the inspect screen of a card belongs to the Binder). */
function navItemOf(location: string): NavItem | undefined {
  if (location.startsWith('/card/')) {
    return NAV.find((item) => item.href === '/');
  }
  return NAV.find((item) => (item.href === '/' ? location === '/' : location.startsWith(item.href)));
}

export function AppShell({ children }: { readonly children: ReactNode }) {
  const [location] = useLocation();
  const save = useSave();
  const persistence = useGame((state) => state.persistence);
  const writeFailed = useGame((state) => state.writeFailed);
  const progress = useMemo(() => dexProgress(buildDex(save.collection)), [save.collection]);
  const mainRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  // While a battle is on the table the table has the whole window: the menu is hidden (the table has a menu of its own).
  const battling = useBattle((state) => state.status !== 'idle');
  const immersive = battling && navItemOf(location)?.href === '/battle';
  // While the introduction of a tab runs, the other entries of the menu are shut. Entries whose introduction is still to come get a dot.
  const running = useActiveTutorial();
  const { tutorialDone } = usePreferences();
  const [introductions] = useState(tutorialEnabled);

  // The title of the browser tab (and of the window in the desktop app) says where the player is, for screen readers too.
  // On a phone the menu bar scrolls sideways, so the entry of this page is brought into view.
  useEffect(() => {
    const item = navItemOf(location);
    document.title = item === undefined ? text.appName : `${item.label} · ${text.appName}`;
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [location]);

  return (
    <div className={cx(styles.shell, immersive && styles.immersive)}>
      <button type="button" className={styles.skip} onClick={() => mainRef.current?.focus()}>
        {text.nav.skip}
      </button>
      <aside className={styles.rail}>
        <Brand />
        <nav ref={navRef} aria-label={text.nav.label} className={styles.nav}>
          {NAV.map((item) => {
            const active = navItemOf(location) === item;
            const tab = tabOf(item.href);
            const shut = tab !== null && isLocked(running, tab);
            const waiting = introductions && tab !== null && !shut && !tutorialDone.includes(tab);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(styles.link, active && styles.active, shut && styles.shut)}
                aria-current={active ? 'page' : undefined}
                aria-disabled={shut ? true : undefined}
                tabIndex={shut ? -1 : undefined}
                title={shut ? text.tutorial.ui.locked : waiting ? text.tutorial.ui.newHere : undefined}
                onClick={(event) => {
                  if (shut) {
                    event.preventDefault();
                  }
                }}
              >
                {item.icon}
                <span>{item.label}</span>
                {waiting && <i className={styles.dot} aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
        <div className={styles.footer}>
          <div className={styles.wallet}>
            <span>Yen</span>
            <strong>{formatYen(save.player.yen)}</strong>
          </div>
          <div className={styles.dexMini}>
            <span>{text.nav.dex}</span>
            <strong>{text.dex.progress(progress.found, progress.total)}</strong>
          </div>
          <ProgressBar value={progress.found} max={progress.total} label={text.nav.dex} />
        </div>
      </aside>
      <div className={styles.topbar}>
        <Brand />
        <strong className={styles.walletMini}>{formatYen(save.player.yen)}</strong>
      </div>
      <main ref={mainRef} tabIndex={-1} className={styles.main}>
        {persistence === 'memory' && (
          <p className={styles.notice} role="status">
            {text.status.memoryOnly}
          </p>
        )}
        {writeFailed && (
          <p className={styles.notice} role="status">
            {text.status.writeFailed}
          </p>
        )}
        {children}
      </main>
      <TutorialHost />
    </div>
  );
}
