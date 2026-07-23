import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import {
  getRecruiterRoom,
  submitRecruiterScore,
  updateRecording,
} from '../api/recruiterApi';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const RecruiterRoomPage = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [socket, setSocket] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'resume'

  // Code Editor State
  const [code, setCode] = useState('// Recruiter Live Coding Environment\n');
  const [language, setLanguage] = useState('javascript');

  // WebRTC Video / Audio / Screen Share State
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Recording State
  const mediaRecorderRef = useRef(null);
  const [recordingState, setRecordingState] = useState('none'); // 'none' | 'recording' | 'saved'
  const [recordedChunks, setRecordedChunks] = useState([]);

  // Scoring Modal State
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scores, setScores] = useState({
    communication: 8,
    technicalKnowledge: 8,
    problemSolving: 8,
    coding: 8,
  });
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    // Fetch Room Data
    getRecruiterRoom(roomId)
      .then((res) => {
        setInterview(res.interview);
        if (res.interview.scores) setScores(res.interview.scores);
        if (res.interview.feedback) setFeedback(res.interview.feedback);
      })
      .catch((err) => console.error(err));

    const newSocket = io(SOCKET_URL, { withCredentials: true });
    setSocket(newSocket);

    // Setup WebRTC peer connection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        newSocket.emit('recruiterIceCandidate', { roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Access Camera & Microphone
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      })
      .catch((err) => console.warn('Media access error:', err));

    // Socket Events
    newSocket.on('connect', () => {
      newSocket.emit('joinRecruiterRoom', { roomId, user });
    });

    newSocket.on('recruiterRoomState', (data) => {
      if (data.code) setCode(data.code);
    });

    newSocket.on('recruiterUserJoined', async ({ socketId }) => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        newSocket.emit('recruiterOffer', { roomId, offer, targetSocketId: socketId });
      } catch (err) {
        console.error('WebRTC offer error:', err);
      }
    });

    newSocket.on('recruiterOffer', async ({ offer, senderSocketId }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        newSocket.emit('recruiterAnswer', { roomId, answer, targetSocketId: senderSocketId });
      } catch (err) {
        console.error('WebRTC answer error:', err);
      }
    });

    newSocket.on('recruiterAnswer', async ({ answer }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('WebRTC set remote description error:', err);
      }
    });

    newSocket.on('recruiterIceCandidate', async ({ candidate }) => {
      try {
        if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('WebRTC ICE candidate error:', err);
      }
    });

    newSocket.on('recruiterCodeSync', ({ code: syncedCode }) => {
      setCode(syncedCode);
    });

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      pc.close();
      newSocket.disconnect();
    };
  }, [roomId, user]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsAudioMuted(!track.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoMuted(!track.enabled);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      if (isScreenSharing) {
        setIsScreenSharing(false);
        return;
      }
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setIsScreenSharing(true);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = screenStream;
      }
      screenStream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
      };
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
    }
  };

  const toggleRecording = async () => {
    if (recordingState === 'none') {
      try {
        const stream = localStreamRef.current || (await navigator.mediaDevices.getUserMedia({ video: true, audio: true }));
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          setRecordedChunks(chunks);
          updateRecording(roomId, 'saved');
          setRecordingState('saved');
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setRecordingState('recording');
        updateRecording(roomId, 'recording');
      } catch (err) {
        alert('Could not start recording session.');
      }
    } else if (recordingState === 'recording') {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    }
  };

  const handleCodeChange = (newVal) => {
    setCode(newVal);
    if (socket) {
      socket.emit('recruiterCodeUpdate', { roomId, code: newVal });
    }
  };

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    try {
      const res = await submitRecruiterScore(roomId, scores, feedback);
      setInterview(res.interview);
      setShowScoreModal(false);
      alert('Evaluation saved successfully!');
    } catch (err) {
      alert('Failed to save evaluation scores.');
    }
  };

  const handleDownloadReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/recruiter')} className="secondary-btn text-xs px-2.5 py-1">
            ← Dashboard
          </button>
          <h1 className="text-lg font-bold text-white tracking-wide">
            Recruiter Live Interview <span className="text-slate-500 text-xs">#{roomId}</span>
          </h1>
          {interview && (
            <span className="text-xs font-semibold text-brand-300 bg-brand-500/10 px-2.5 py-0.5 rounded-full border border-brand-500/20">
              Candidate: {interview.candidateName} ({interview.jobRole})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleRecording}
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 ${
              recordingState === 'recording'
                ? 'bg-rose-600 text-white animate-pulse'
                : recordingState === 'saved'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⏺️ {recordingState === 'recording' ? 'Recording...' : recordingState === 'saved' ? 'Recording Saved' : 'Start Recording'}
          </button>

          <button
            onClick={() => setShowScoreModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-1.5 rounded transition shadow"
          >
            ⭐ Score Candidate
          </button>

          <button
            onClick={handleDownloadReport}
            className="primary-btn text-xs py-1.5 px-3 font-bold flex items-center gap-1"
          >
            📥 Download Report
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Video Streams & Controls */}
        <div className="w-1/3 border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Candidate Stream */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Candidate Video (WebRTC)
            </span>
            <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {!remoteVideoRef.current?.srcObject && (
                <div className="text-center p-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-xl flex items-center justify-center mx-auto mb-1">
                    👤
                  </div>
                  <p className="text-xs text-slate-400">Waiting for candidate video feed...</p>
                </div>
              )}
            </div>
          </div>

          {/* Recruiter Stream */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Your Video (Recruiter)
            </span>
            <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {isVideoMuted && (
                <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center text-xs text-slate-400">
                  Camera Off
                </div>
              )}
            </div>
          </div>

          {/* Media Control Toolbar */}
          <div className="flex justify-center gap-2 pt-1">
            <button
              onClick={toggleAudio}
              className={`p-2.5 rounded-lg border text-xs font-bold transition ${
                isAudioMuted ? 'bg-rose-600/20 border-rose-500 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {isAudioMuted ? '🎙️ Muted' : '🎙️ Mic On'}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-2.5 rounded-lg border text-xs font-bold transition ${
                isVideoMuted ? 'bg-rose-600/20 border-rose-500 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {isVideoMuted ? '📹 Camera Off' : '📹 Camera On'}
            </button>
            <button
              onClick={startScreenShare}
              className={`p-2.5 rounded-lg border text-xs font-bold transition ${
                isScreenSharing ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              🖥️ {isScreenSharing ? 'Stop Share' : 'Screen Share'}
            </button>
          </div>

          {/* Screen Share Preview if active */}
          {isScreenSharing && (
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                Active Screen Share
              </span>
              <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden border border-cyan-500/50">
                <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Tabbed Interface (Coding Editor vs Resume Viewer) */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {/* Tab Header */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  activeTab === 'editor' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                💻 Live Coding Editor
              </button>
              <button
                onClick={() => setActiveTab('resume')}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  activeTab === 'resume' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                📄 Candidate Resume Viewer
              </button>
            </div>

            {activeTab === 'editor' && (
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200 focus:outline-none"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            )}
          </div>

          {/* Content Body */}
          <div className="flex-1 relative">
            {activeTab === 'editor' ? (
              <Editor
                height="100%"
                theme="vs-dark"
                language={language}
                value={code}
                onChange={handleCodeChange}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16 },
                }}
              />
            ) : (
              <div className="p-6 overflow-y-auto h-full space-y-4">
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white">{interview?.candidateName}</h3>
                      <p className="text-xs text-brand-400 font-semibold">{interview?.candidateEmail}</p>
                    </div>
                    <span className="px-3 py-1 bg-brand-500/20 text-brand-300 rounded-full text-xs font-bold">
                      {interview?.jobRole}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Resume Document</h4>
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                      {interview?.resumeText}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recruiter Candidate Scoring & Feedback Modal */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <h3 className="text-xl font-bold text-white text-center">Score Candidate Performance</h3>

            <form onSubmit={handleSaveEvaluation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Communication (1-10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={scores.communication}
                    onChange={(e) => setScores({ ...scores, communication: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Technical Knowledge (1-10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={scores.technicalKnowledge}
                    onChange={(e) => setScores({ ...scores, technicalKnowledge: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Problem Solving (1-10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={scores.problemSolving}
                    onChange={(e) => setScores({ ...scores, problemSolving: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Coding (1-10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={scores.coding}
                    onChange={(e) => setScores({ ...scores, coding: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Overall Feedback & Recommendation
                </label>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Strong technical acumen, solid algorithm skills..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScoreModal(false)}
                  className="secondary-btn text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn text-xs font-bold">
                  Save Evaluation & Generate Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterRoomPage;
