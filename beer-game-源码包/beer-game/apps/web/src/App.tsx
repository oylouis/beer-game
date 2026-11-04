import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Player from './pages/Player';
import Lobby from './pages/Lobby';
import Review from './pages/Review';

export default function App() {
  return (
    <div className="min-h-[100dvh]">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/player/:roomId" element={<Player />} />
        <Route path="/lobby/:roomId" element={<Lobby />} />
        <Route path="/review/:roomId" element={<Review />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}