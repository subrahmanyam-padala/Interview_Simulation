import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import {
  searchCandidates,
  getInvitations,
  sendInvitation,
  respondInvitation,
  updatePeerProfile,
} from '../api/peerApi';

const PeerCandidatesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [invitations, setInvitations] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [skillsInput, setSkillsInput] = useState(user?.skills?.join(', ') || 'JavaScript, React, Node.js');
  const [domainInput, setDomainInput] = useState(user?.preferredDomain || 'Software Engineering');
  const [experienceInput, setExperienceInput] = useState(user?.experienceLevel || 'Intermediate');

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const res = await searchCandidates(searchQuery, domainFilter);
      setCandidates(res.candidates || []);
    } catch (err) {
      console.error('Failed to search candidates', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvs = async () => {
    try {
      const res = await getInvitations();
      setInvitations(res);
    } catch (err) {
      console.error('Failed to fetch invitations', err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchInvs();
  }, [searchQuery, domainFilter]);

  const handleSendInvite = async (candidateId) => {
    try {
      await sendInvitation(candidateId, domainInput);
      alert('Invitation sent successfully!');
      fetchInvs();
    } catch (err) {
      alert('Failed to send invitation.');
    }
  };

  const handleRespond = async (invitationId, status) => {
    try {
      const res = await respondInvitation(invitationId, status);
      fetchInvs();
      if (status === 'accepted') {
        navigate(`/peer/room/${res.invitation.roomId}`);
      }
    } catch (err) {
      alert('Failed to update invitation status.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await updatePeerProfile({
        skills: skillsInput.split(',').map((s) => s.trim()),
        preferredDomain: domainInput,
        experienceLevel: experienceInput,
      });
      setShowProfileModal(false);
      alert('Profile updated!');
      fetchCandidates();
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  return (
    <AppShell title="Peer Mock Interview" subtitle="Connect, practice, and conduct peer-to-peer technical mock interviews.">
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <input
              type="text"
              placeholder="Search by name, skill, or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-brand-500 min-w-[240px]"
            />
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-300 text-sm focus:outline-none"
            >
              <option value="">All Domains</option>
              <option value="Software Engineering">Software Engineering</option>
              <option value="Full Stack Development">Full Stack Development</option>
              <option value="Frontend Development">Frontend Development</option>
              <option value="Backend Development">Backend Development</option>
              <option value="Data Science / AI">Data Science / AI</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowProfileModal(true)}
              className="secondary-btn text-sm flex items-center gap-1.5"
            >
              ⚙️ My Candidate Profile
            </button>
            <button
              onClick={() => navigate('/peer/history')}
              className="secondary-btn text-sm flex items-center gap-1.5"
            >
              📜 Interview History
            </button>
          </div>
        </div>

        {/* Incoming Invitations Banner */}
        {invitations.incoming?.filter((i) => i.status === 'pending').length > 0 && (
          <div className="glass-card p-4 border-l-4 border-amber-500 bg-amber-500/10">
            <h3 className="text-lg font-bold text-amber-300 mb-3">Pending Invitations</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {invitations.incoming
                .filter((i) => i.status === 'pending')
                .map((inv) => (
                  <div key={inv._id} className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{inv.sender?.name}</p>
                      <p className="text-xs text-slate-400">Domain: {inv.domain}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(inv._id, 'accepted')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(inv._id, 'rejected')}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Candidate Cards Grid */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Available Candidates</h2>

          {loading ? (
            <p className="text-slate-400">Loading candidate profiles...</p>
          ) : candidates.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-400">
              No candidates found matching your criteria.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {candidates.map((cand) => (
                <div key={cand._id} className="glass-card p-5 flex flex-col justify-between hover:border-brand-500/50 transition">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg">
                        {cand.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg leading-tight">{cand.name}</h3>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                          {cand.experienceLevel || 'Intermediate'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-slate-300 mb-4">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium uppercase">Domain</span>
                        <span className="text-white font-medium">{cand.preferredDomain || 'Software Engineering'}</span>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block font-medium uppercase">Skills</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(cand.skills || ['JavaScript', 'React']).map((sk, idx) => (
                            <span key={idx} className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded text-xs border border-slate-700">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendInvite(cand._id)}
                    className="w-full primary-btn py-2 text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <span>✉️</span> Send Interview Invite
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile Update Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-xl font-bold text-white">Update Candidate Profile</h3>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Skills (comma separated)
                  </label>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Preferred Interview Domain
                  </label>
                  <select
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Full Stack Development">Full Stack Development</option>
                    <option value="Frontend Development">Frontend Development</option>
                    <option value="Backend Development">Backend Development</option>
                    <option value="Data Science / AI">Data Science / AI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Experience Level
                  </label>
                  <select
                    value={experienceInput}
                    onChange={(e) => setExperienceInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="secondary-btn text-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn text-sm">
                    Save Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default PeerCandidatesPage;
