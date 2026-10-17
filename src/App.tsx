import { useGame } from './game/store';
import CharacterCreation from './components/CharacterCreation';
import Dashboard from './components/Dashboard';

export default function App() {
  const hasGame = useGame((s) => s.game !== null);
  return hasGame ? <Dashboard /> : <CharacterCreation />;
}
