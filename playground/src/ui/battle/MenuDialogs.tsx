// The windows of the battle menu: the menu itself, the log of what happened, and the question before giving up.

import { useEffect, useRef } from 'react';
import type { LogLine } from '../../state/battleSession';
import { Button } from '../components/controls';
import { Dialog } from '../components/Dialog';
import { cx } from '../format';
import { text } from '../text';
import styles from './Table.module.css';

export interface MenuDialogProps {
  readonly playing: boolean;
  readonly onResume: () => void;
  readonly onHowTo: () => void;
  readonly onLog: () => void;
  readonly onGiveUp: () => void;
  readonly onLeave: () => void;
}

export function MenuDialog({ playing, onResume, onHowTo, onLog, onGiveUp, onLeave }: MenuDialogProps) {
  const words = text.battle.table;
  return (
    <Dialog title={words.menuTitle} onClose={onResume}>
      <div className={styles.menuList}>
        <Button kind="primary" onClick={onResume}>
          {words.resume}
        </Button>
        <Button onClick={onHowTo}>{text.battle.howTo}</Button>
        <Button onClick={onLog}>{words.log}</Button>
        {playing && (
          <Button kind="danger" onClick={onGiveUp}>
            {text.battle.giveUp}
          </Button>
        )}
        <Button kind="quiet" onClick={onLeave}>
          {words.leave}
        </Button>
        <p>{words.leaveHint}</p>
      </div>
    </Dialog>
  );
}

/** What happened in the battle so far, the newest line at the bottom. */
export function LogDialog({ log, onClose }: { readonly log: readonly LogLine[]; readonly onClose: () => void }) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const element = list.current;
    if (element !== null) {
      element.scrollTop = element.scrollHeight;
    }
  }, [log.length]);
  return (
    <Dialog title={text.battle.table.log} onClose={onClose}>
      <ol ref={list} className={styles.logList} aria-label={text.battle.board.log}>
        {log.map((line) => (
          <li key={line.id} className={cx(styles.line, line.side === 'you' && styles.sideYou, line.side === 'them' && styles.sideThem, line.side === 'neutral' && styles.sideNeutral, line.heading && styles.heading)}>
            {line.text}
          </li>
        ))}
      </ol>
    </Dialog>
  );
}

export function GiveUpDialog({ onKeep, onGiveUp }: { readonly onKeep: () => void; readonly onGiveUp: () => void }) {
  return (
    <Dialog title={text.battle.giveUp} onClose={onKeep}>
      <p className={styles.confirmText}>{text.battle.giveUpConfirm}</p>
      <div className={styles.resultActions}>
        <Button onClick={onKeep}>{text.battle.keepPlaying}</Button>
        <Button kind="danger" onClick={onGiveUp}>
          {text.battle.giveUpYes}
        </Button>
      </div>
    </Dialog>
  );
}
