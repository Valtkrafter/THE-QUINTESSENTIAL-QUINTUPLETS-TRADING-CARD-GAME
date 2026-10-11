import { useBattle } from '../../state/app';
import { Board } from './Board';
import { Lobby } from './Lobby';

/** The battle page: the lobby while no battle is running, the board while one is. */
export default function BattleScreen() {
  const status = useBattle((state) => state.status);
  return status === 'idle' ? <Lobby /> : <Board />;
}
