import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { getInterviewRoom, submitFeedback } from '../api/peerApi';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const PeerInterviewRoomPage = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [role, setRole] = useState('interviewee');
  const [code, setCode] = useState('// Shared Peer Interview Code Editor\n');
  const [language, setLanguage] = useState('javascript');
  
  // Real-time chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [showChat, setShowChat] = useState(true);

  // WebRTC Video/Audio state
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // Post-interview Rating & Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    // Load interview room details
    getInterviewRoom(roomId).catch((err) => console.error(err));

    const newSocket = io(SOCKET_URL, { withCredentials: true });
    setSocket(newSocket);

    // Setup WebRTC peer connection configuration
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        newSocket.emit('iceCandidate', { roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Get media stream
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      })
      .catch((err) => {
        console.warn('Camera/Microphone access not available or denied:', err);
      });

    // Socket Event Listeners
    newSocket.on('connect', () => {
      newSocket.emit('joinPeerRoom', { roomId, user });
    });

    newSocket.on('peerRoomState', (data) => {
      if (data.code) setCode(data.code);
      if (data.roles && data.roles[user._id || user.id]) {
        setRole(data.roles[user._id || user.id]);
      }
    });

    newSocket.on('peerUserJoined', async ({ socketId }) => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        newSocket.emit('peerOffer', { roomId, offer, targetSocketId: socketId });
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
      }
    });

    newSocket.on('peerOffer', async ({ offer, senderSocketId }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        newSocket.emit('peerAnswer', { roomId, answer, targetSocketId: senderSocketId });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    });

    newSocket.on('peerAnswer', async ({ answer }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('Error handling WebRTC answer:', err);
      }
    });

    newSocket.on('iceCandidate', async ({ candidate }) => {
      try {
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    newSocket.on('newPeerMessage', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    newSocket.on('peerCodeSync', ({ code: syncedCode }) => {
      setCode(syncedCode);
    });

    newSocket.on('peerRoleUpdated', ({ roles }) => {
      if (roles && roles[user._id || user.id]) {
        setRole(roles[user._id || user.id]);
      }
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
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const handleCodeChange = (newVal) => {
    setCode(newVal);
    if (socket) {
      socket.emit('peerCodeUpdate', { roomId, code: newVal });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket) return;
    socket.emit('sendPeerMessage', {
      roomId,
      message: messageInput,
      senderName: user.name,
    });
    setMessageInput('');
  };

  const handleRoleToggle = () => {
    const nextRole = role === 'interviewer' ? 'interviewee' : 'interviewer';
    setRole(nextRole);
    if (socket) {
      socket.emit('switchPeerRole', { roomId, userId: user._id || user.id, newRole: nextRole });
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      const res = await submitFeedback(roomId, rating, feedbackText);
      setReport(res.interview.reports);
      alert('Feedback submitted successfully!');
    } catch (err) {
      alert('Failed to submit feedback.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white tracking-wide">
            Peer Mock Interview <span className="text-slate-500 font-mono text-sm">#{roomId}</span>
          </h1>
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            <span className="text-xs text-slate-400">Current Role:</span>
            <span className={`text-xs font-bold uppercase ${role === 'interviewer' ? 'text-amber-400' : 'text-cyan-400'}`}>
              {role}
            </span>
          </div>
          <button
            onClick={handleRoleToggle}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white rounded transition"
          >
            🔄 Switch Role
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChat(!showChat)}
            className="secondary-btn text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            💬 {showChat ? 'Hide Chat' : 'Show Chat'}
          </button>
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-4 rounded transition shadow-lg"
          >
            ✅ Complete & Rate Interview
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: WebRTC Video / Audio Feeds */}
        <div className="w-1/4 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Peer Feed (WebRTC)
            </span>
            <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!remoteVideoRef.current?.srcObject && (
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-2xl flex items-center justify-center mx-auto mb-2">
                    👤
                  </div>
                  <p className="text-xs text-slate-400">Waiting for peer video stream...</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Your Stream ({user.name})
            </span>
            <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isVideoMuted && (
                <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center text-xs text-slate-400">
                  Camera Muted
                </div>
              )}
            </div>
          </div>

          {/* Media Control Toolbar */}
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full border transition ${
                isAudioMuted ? 'bg-rose-600/20 border-rose-500 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
              title="Toggle Microphone"
            >
              {isAudioMuted ? '🎙️❌' : '🎙️'}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full border transition ${
                isVideoMuted ? 'bg-rose-600/20 border-rose-500 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
              title="Toggle Video"
            >
              {isVideoMuted ? '📹❌' : '📹'}
            </button>
          </div>
        </div>

        {/* Center: Shared Code Editor */}
        <div className="flex-1 flex flex-col bg-slate-950">
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase">Shared Editor</span>
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
            </div>
          </div>

          <div className="flex-1 relative">
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
          </div>
        </div>

        {/* Right Side: Real-time Chat Drawer */}
        {showChat && (
          <div className="w-80 border-l border-slate-800 bg-slate-900/90 flex flex-col">
            <div className="p-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Real-time Interview Chat</h3>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No messages yet.</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/50">
                    <span className="text-[11px] font-bold text-brand-400 block">{msg.senderName}</span>
                    <p className="text-xs text-slate-200 mt-0.5">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none"
              />
              <button type="submit" className="primary-btn text-xs px-3">
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Post-Interview Rating & Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <h3 className="text-2xl font-bold text-white text-center">Interview Feedback & Rating</h3>

            {report ? (
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="font-bold text-brand-400 mb-2">Interviewer Report</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{report.interviewerReport}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="font-bold text-indigo-400 mb-2">Interviewee Report</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{report.intervieweeReport}</p>
                </div>

                <button
                  onClick={() => navigate('/peer')}
                  className="w-full primary-btn py-2.5 text-sm font-bold"
                >
                  Return to Peer Lobby
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                    Rate Participant Performance (1 - 5 Stars)
                  </label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-2xl ${rating >= star ? 'text-amber-400' : 'text-slate-700'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Constructive Feedback
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Provide feedback on problem solving, communication, and technical depth..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="secondary-btn text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn text-xs">
                    Submit & Generate Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PeerInterviewRoomPage;
