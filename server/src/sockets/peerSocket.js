export const initPeerSocket = (io) => {
  const peerRooms = {};

  io.on('connection', (socket) => {
    socket.on('joinPeerRoom', ({ roomId, user }) => {
      socket.join(roomId);

      if (!peerRooms[roomId]) {
        peerRooms[roomId] = {
          users: [],
          code: '// Shared Peer Interview Code Editor\n',
          roles: {},
        };
      }

      const room = peerRooms[roomId];
      if (!room.users.find((u) => u.socketId === socket.id)) {
        // Assign default role (first user = interviewer, second = interviewee)
        const role = room.users.length === 0 ? 'interviewer' : 'interviewee';
        room.roles[user._id || user.id] = role;

        room.users.push({
          socketId: socket.id,
          user,
          role,
        });
      }

      // Notify others in room
      socket.to(roomId).emit('peerUserJoined', { user, socketId: socket.id });

      // Send initial room state to joining user
      socket.emit('peerRoomState', {
        users: room.users,
        code: room.code,
        roles: room.roles,
      });
    });

    // WebRTC Signaling for Video & Voice Calling
    socket.on('peerOffer', ({ roomId, offer, targetSocketId }) => {
      socket.to(targetSocketId || roomId).emit('peerOffer', {
        offer,
        senderSocketId: socket.id,
      });
    });

    socket.on('peerAnswer', ({ roomId, answer, targetSocketId }) => {
      socket.to(targetSocketId || roomId).emit('peerAnswer', {
        answer,
        senderSocketId: socket.id,
      });
    });

    socket.on('iceCandidate', ({ roomId, candidate, targetSocketId }) => {
      socket.to(targetSocketId || roomId).emit('iceCandidate', {
        candidate,
        senderSocketId: socket.id,
      });
    });

    // Real-time Chat
    socket.on('sendPeerMessage', ({ roomId, message, senderName }) => {
      const msgObj = { senderName, text: message, createdAt: new Date() };
      io.to(roomId).emit('newPeerMessage', msgObj);
    });

    // Real-time Shared Code Editor
    socket.on('peerCodeUpdate', ({ roomId, code }) => {
      if (peerRooms[roomId]) {
        peerRooms[roomId].code = code;
      }
      socket.to(roomId).emit('peerCodeSync', { code });
    });

    // Role Switching (Interviewer / Interviewee)
    socket.on('switchPeerRole', ({ roomId, userId, newRole }) => {
      const room = peerRooms[roomId];
      if (room) {
        room.roles[userId] = newRole;
        const u = room.users.find((x) => (x.user._id || x.user.id) === userId);
        if (u) u.role = newRole;

        io.to(roomId).emit('peerRoleUpdated', { roles: room.roles, users: room.users });
      }
    });

    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        if (peerRooms[roomId]) {
          peerRooms[roomId].users = peerRooms[roomId].users.filter(
            (u) => u.socketId !== socket.id
          );
          socket.to(roomId).emit('peerUserLeft', { socketId: socket.id });
        }
      }
    });
  });
};
