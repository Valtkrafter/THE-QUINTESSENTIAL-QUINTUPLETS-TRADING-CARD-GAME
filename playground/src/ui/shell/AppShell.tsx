import { useMemo, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { buildDex, dexProgress } from '../../domain/collection';
import { useGame, useSave } from '../../state/app';
import { ProgressBar } from '../components/controls';
import { BinderIcon, DexIcon, PacksIcon, SettingsIcon, ShowcaseIcon } from '../components/icons';
import { cx, formatYen } from '../format';
import { text } from '../text';
import styles from './AppShell.module.css';

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: ReactNode;
}

const NAV: readonly NavItem[] = [
  { href: '/packs', label: text.nav.packs, icon: <PacksIcon /> },
  { href: '/', label: text.nav.binder, icon: <BinderIcon /> },
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

export function AppShell({ children }: { readonly children: ReactNode }) {
  const [location] = useLocation();
  const save = useSave();
  const persistence = useGame((state) => state.persistence);
  const writeFailed = useGame((state) => state.writeFailed);
  const progress = useMemo(() => dexProgress(buildDex(save.collection)), [save.collection]);

  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <Brand />
        <nav aria-label={text.nav.label} className={styles.nav}>
          {NAV.map((item) => {
            const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={cx(styles.link, active && styles.active)} aria-current={active ? 'page' : undefined}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className={styles.footer}>
          <div className={styles.wallet}>
            <span>{text.packs.yen}</span>
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
      <main className={styles.main}>
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
    </div>
  );
}
