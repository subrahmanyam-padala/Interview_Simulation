import mongoose from 'mongoose';

const peerInvitationSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    domain: { type: String, default: 'Full Stack Development' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    roomId: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('PeerInvitation', peerInvitationSchema);
