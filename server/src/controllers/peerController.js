import User from '../models/User.js';
import PeerInvitation from '../models/PeerInvitation.js';
import PeerInterview from '../models/PeerInterview.js';

export const searchCandidates = async (req, res, next) => {
  try {
    const { query, domain } = req.query;
    const filter = { _id: { $ne: req.user._id } };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { skills: { $regex: query, $options: 'i' } },
      ];
    }

    if (domain) {
      filter.preferredDomain = { $regex: domain, $options: 'i' };
    }

    const users = await User.find(filter).select('-password');
    const candidates = users.map((u) => u.toSafeObject());

    res.json({ success: true, candidates });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { skills, preferredDomain, experienceLevel } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (skills) user.skills = Array.isArray(skills) ? skills : skills.split(',').map((s) => s.trim());
    if (preferredDomain) user.preferredDomain = preferredDomain;
    if (experienceLevel) user.experienceLevel = experienceLevel;

    await user.save();
    res.json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

export const sendInvitation = async (req, res, next) => {
  try {
    const { receiverId, domain } = req.body;
    const roomId = `peer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const invitation = await PeerInvitation.create({
      sender: req.user._id,
      receiver: receiverId,
      domain: domain || 'General Technical',
      roomId,
    });

    res.status(201).json({ success: true, invitation });
  } catch (error) {
    next(error);
  }
};

export const getInvitations = async (req, res, next) => {
  try {
    const incoming = await PeerInvitation.find({ receiver: req.user._id })
      .populate('sender', 'name email skills preferredDomain experienceLevel')
      .sort({ createdAt: -1 });

    const outgoing = await PeerInvitation.find({ sender: req.user._id })
      .populate('receiver', 'name email skills preferredDomain experienceLevel')
      .sort({ createdAt: -1 });

    res.json({ success: true, incoming, outgoing });
  } catch (error) {
    next(error);
  }
};

export const respondInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'

    const invitation = await PeerInvitation.findById(id);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.receiver.toString() !== req.user._id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    invitation.status = status;
    await invitation.save();

    if (status === 'accepted') {
      let interview = await PeerInterview.findOne({ roomId: invitation.roomId });
      if (!interview) {
        interview = await PeerInterview.create({
          roomId: invitation.roomId,
          participants: [
            { user: invitation.sender, role: 'interviewer' },
            { user: invitation.receiver, role: 'interviewee' },
          ],
        });
      }
    }

    res.json({ success: true, invitation });
  } catch (error) {
    next(error);
  }
};

export const getInterviewRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    let interview = await PeerInterview.findOne({ roomId }).populate(
      'participants.user',
      'name email skills preferredDomain experienceLevel'
    );

    if (!interview) {
      interview = await PeerInterview.create({
        roomId,
        participants: [
          { user: req.user._id, role: 'interviewer' }
        ]
      });
      interview = await PeerInterview.findById(interview._id).populate(
        'participants.user',
        'name email skills preferredDomain experienceLevel'
      );
    }

    res.json({ success: true, interview });
  } catch (error) {
    next(error);
  }
};

export const submitFeedback = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { rating, feedback } = req.body;

    const interview = await PeerInterview.findOne({ roomId });
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    const participant = interview.participants.find(
      (p) => p.user.toString() === req.user._id
    );

    if (participant) {
      participant.rating = rating;
      participant.feedback = feedback;
    } else {
      interview.participants.push({ user: req.user._id, rating, feedback });
    }

    // Check if both submitted or update status
    interview.status = 'completed';

    // Generate feedback report
    const p1 = interview.participants[0];
    const p2 = interview.participants[1];

    interview.reports = {
      interviewerReport: `Peer Mock Interview Report - Overall Rating: ${p1?.rating || 5}/5. Feedback: ${p1?.feedback || 'Good technical performance and problem solving capabilities.'}`,
      intervieweeReport: `Peer Mock Interview Report - Overall Rating: ${p2?.rating || 5}/5. Feedback: ${p2?.feedback || 'Engaging interviewer with clear code review guidelines.'}`
    };

    await interview.save();
    res.json({ success: true, interview });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const interviews = await PeerInterview.find({
      'participants.user': req.user._id,
    })
      .populate('participants.user', 'name email skills preferredDomain')
      .sort({ createdAt: -1 });

    res.json({ success: true, interviews });
  } catch (error) {
    next(error);
  }
};
