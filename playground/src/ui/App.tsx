import { lazy, Suspense, useEffect } from 'react';
import { Link, Redirect, Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { gameStore, preferencesStore, useGame } from '../state/app';
import { useStore } from 'zustand';
import { ArrowLeftIcon } from './components/icons';
import BattleScreen from './battle/BattleScreen';
import BinderScreen from './binder/BinderScreen';
import DamagedScreen from './DamagedScreen';
import DeckEditor from './decks/DeckEditor';
import DecksScreen from './decks/DecksScreen';
import DexScreen from './dex/DexScreen';
import OddsScreen from './packs/OddsScreen';
import PacksScreen from './packs/PacksScreen';
import { AppShell } from './shell/AppShell';
import SettingsScreen from './settings/SettingsScreen';
import ShowcaseScreen from './showcase/ShowcaseScreen';
import { text } from './text';
import styles from './App.module.css';

// The 3D screens bring three.js with them (the biggest part of the game), so they load only when opened.
const InspectScreen = lazy(() => import('./inspect/InspectScreen'));
const HoloLab = lazy(() => import('./lab/HoloLab'));

function Splash() {
  return (
    <div className={styles.splash} role="status">
      <span className={styles.pulse} aria-hidden="true" />
      {text.loading}
    </div>
  );
}

function Game() {
  const phase = useGame((state) => state.phase);
  const preferencesLoaded = useStore(preferencesStore, (state) => state.loaded);

  if (phase === 'damaged') {
    return <DamagedScreen />;
  }
  if (phase !== 'ready' || !preferencesLoaded) {
    return <Splash />;
  }
  return (
    <AppShell>
      <Suspense fallback={<Splash />}>
        <Switch>
          <Route path="/" component={BinderScreen} />
          <Route path="/battle" component={BattleScreen} />
          <Route path="/decks" component={DecksScreen} />
          <Route path="/decks/new">{() => <DeckEditor key="new" source={{ kind: 'new' }} />}</Route>
          <Route path="/decks/template/:id">{(params) => <DeckEditor key={`template-${params.id}`} source={{ kind: 'template', id: params.id }} />}</Route>
          <Route path="/decks/:id">{(params) => <DeckEditor key={params.id} source={{ kind: 'edit', id: params.id }} />}</Route>
          <Route path="/packs" component={PacksScreen} />
          <Route path="/packs/odds" component={OddsScreen} />
          <Route path="/dex" component={DexScreen} />
          <Route path="/showcase" component={ShowcaseScreen} />
          <Route path="/settings" component={SettingsScreen} />
          <Route path="/card/:uid">{(params) => <InspectScreen key={params.uid} uid={params.uid} />}</Route>
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  useEffect(() => {
    void gameStore.getState().start();
    void preferencesStore.getState().start();
  }, []);

  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/lab">
          <Suspense fallback={<Splash />}>
            <Link href="/settings" className={styles.labBack}>
              <ArrowLeftIcon size={16} />
              {text.lab.back}
            </Link>
            <HoloLab />
          </Suspense>
        </Route>
        <Route>
          <Game />
        </Route>
      </Switch>
    </Router>
  );
}
