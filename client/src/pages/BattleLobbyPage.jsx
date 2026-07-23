import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';

const BattleLobbyPage = () => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleJoin = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/battle/${roomId}`);
    }
  };

  const handleCreate = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/battle/${newRoomId}`);
  };

  return (
    <AppShell title="Competitive Coding Battle" subtitle="Challenge a friend to a real-time coding duel!">
      <div className="max-w-md mx-auto w-full glass-card rounded-xl p-8 shadow-2xl mt-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-white">
          Join or Create a Room
        </h2>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Join an existing room</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room ID"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={!roomId.trim()}
            className="w-full primary-btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Battle
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-slate-700"></div>
          <span className="px-4 text-slate-400 text-sm">OR</span>
          <div className="flex-1 border-t border-slate-700"></div>
        </div>

        <button
          onClick={handleCreate}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg px-4 py-3 transition-colors shadow-lg"
        >
          Create New Room
        </button>
      </div>
    </AppShell>
  );
};

export default BattleLobbyPage;
