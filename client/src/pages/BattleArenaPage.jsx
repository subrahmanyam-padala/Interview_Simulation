import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const BattleArenaPage = () => {
  const { id: roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState('waiting');
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [battleReport, setBattleReport] = useState(null);
  
  const timerRef = useRef(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, { withCredentials: true });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('joinBattle', { roomId, user });
    });

    newSocket.on('roomUpdate', (data) => {
      setPlayers(data.players);
      setStatus(data.status);
      if (data.problem && !problem) {
        setProblem(data.problem);
        setCode(data.problem.starterCode[language]);
      }
    });

    newSocket.on('battleStarted', (data) => {
      setProblem(data.problem);
      setCode(data.problem.starterCode[language]);
      
      const endTime = data.startTime + (data.duration * 1000);
      
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          handleTimeUp();
        }
      }, 1000);
    });

    newSocket.on('battleEnded', (data) => {
      setStatus('completed');
      setPlayers(data.players);
      setBattleReport({
        winner: data.winner,
        players: data.players
      });
      clearInterval(timerRef.current);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      newSocket.disconnect();
    };
  }, [roomId, user]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (problem && problem.starterCode[newLang]) {
      setCode(problem.starterCode[newLang]);
    }
    if (socket) {
      socket.emit('codeUpdate', { roomId, code, language: newLang });
    }
  };

  const handleEditorChange = (value) => {
    setCode(value);
    if (socket) {
      socket.emit('codeUpdate', { roomId, code: value, language });
    }
  };

  const handleTimeUp = () => {
    if (status !== 'completed' && socket) {
      socket.emit('submitCode', {
        roomId,
        executionTime: 9999,
        passedTestCases: 0,
        totalTestCases: problem?.testCases?.length || 0
      });
    }
  };

  const runCode = () => {
    // In a real app, this would execute code in a sandbox.
    // For this simulation, we'll mock the execution.
    alert('Code executed successfully against sample test cases!');
  };

  const submitCode = () => {
    // Mocking evaluation logic
    const isSuccess = Math.random() > 0.3; // 70% chance to pass
    const passedTestCases = isSuccess ? problem.testCases.length : Math.floor(Math.random() * problem.testCases.length);
    const executionTime = Math.floor(Math.random() * 100) + 10; // ms

    if (socket) {
      socket.emit('submitCode', {
        roomId,
        executionTime,
        passedTestCases,
        totalTestCases: problem.testCases.length
      });
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (status === 'waiting') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold mb-4">Waiting for Opponent...</h2>
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
          <p className="text-gray-400 mb-2">Share this Room ID with your friend:</p>
          <div className="text-4xl font-mono tracking-wider text-blue-400 bg-gray-900 p-4 rounded text-center">
            {roomId}
          </div>
        </div>
        <div className="flex gap-4">
          {players.map((p, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold mb-2">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span>{p.name}</span>
              <span className="text-xs text-green-400">{p.status}</span>
            </div>
          ))}
          {players.length < 2 && (
            <div className="flex flex-col items-center opacity-50">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center border-2 border-dashed border-gray-500 mb-2">
                ?
              </div>
              <span>Waiting...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'completed' && battleReport) {
    const winnerPlayer = battleReport.players.find(p => p.userId === battleReport.winner);
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 rounded-xl p-8 shadow-2xl border border-gray-700">
          <h1 className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Battle Report
          </h1>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">Winner</h2>
            <div className="text-3xl font-bold text-green-400">
              {winnerPlayer ? winnerPlayer.name : 'Draw / No Winner'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            {battleReport.players.map((p, i) => (
              <div key={i} className={`bg-gray-900 p-4 rounded-lg border ${winnerPlayer?.userId === p.userId ? 'border-yellow-500' : 'border-gray-700'}`}>
                <h3 className="text-xl font-semibold mb-3">{p.name}</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>Language: <span className="text-white capitalize">{p.language}</span></p>
                  <p>Status: <span className="text-white">{p.status}</span></p>
                  <p>Test Cases: <span className="text-white">{p.passedTestCases} / {problem?.testCases?.length || 0}</span></p>
                  <p>Execution Time: <span className="text-white">{p.executionTime ? `${p.executionTime}ms` : '-'}</span></p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/battle')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-3 transition-colors">
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white tracking-wide">Arena <span className="text-gray-500">#{roomId}</span></h1>
          <div className="bg-gray-900 px-4 py-1.5 rounded-full border border-gray-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="font-mono text-lg font-bold text-white">{formatTime(timeLeft)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${p.userId === user._id ? 'bg-blue-600' : 'bg-purple-600'}`}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-200">{p.name}</span>
                  <span className={`text-[10px] uppercase font-bold ${p.status === 'Passed' ? 'text-green-400' : p.status === 'Submitted' ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Problem Statement */}
        <div className="w-1/3 border-r border-gray-700 flex flex-col bg-gray-800">
          <div className="p-4 border-b border-gray-700 bg-gray-800/50">
            <h2 className="text-2xl font-bold text-white mb-2">{problem?.title}</h2>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-900 text-green-300 border border-green-800">Easy</span>
            </div>
          </div>
          <div className="p-6 overflow-y-auto flex-1 prose prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-gray-300 leading-relaxed">
              {problem?.description}
            </p>
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-white mb-4 border-b border-gray-700 pb-2">Examples</h3>
              {problem?.testCases.map((tc, i) => (
                <div key={i} className="mb-4 bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="mb-2"><strong className="text-gray-400">Input:</strong> <br/><span className="font-mono text-blue-300">{tc.input}</span></p>
                  <p><strong className="text-gray-400">Output:</strong> <br/><span className="font-mono text-green-300">{tc.expectedOutput}</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Editor & Actions */}
        <div className="w-2/3 flex flex-col">
          {/* Editor Toolbar */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
            <select
              value={language}
              onChange={handleLanguageChange}
              className="bg-gray-900 border border-gray-600 text-sm rounded-md px-3 py-1.5 text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
            
            <div className="flex gap-2">
              <button onClick={runCode} className="px-4 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium transition-colors border border-gray-600">
                Run Code
              </button>
              <button onClick={submitCode} className="px-4 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors shadow-lg shadow-green-900/20">
                Submit
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 relative">
            <Editor
              height="100%"
              theme="vs-dark"
              language={language === 'c' || language === 'cpp' ? 'cpp' : language}
              value={code}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                lineHeight: 24,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default BattleArenaPage;
