export const initRecruiterSocket = (io) => {
  const recruiterRooms = {};

  io.on('connection', (socket) => {
    socket.on('joinRecruiterRoom', ({ roomId, user }) => {
      socket.join(roomId);

      if (!recruiterRooms[roomId]) {
        recruiterRooms[roomId] = {
          users: [],
          code: '// Recruiter Live Coding Environment\n',
        };
      }

      const room = recruiterRooms[roomId];
      if (!room.users.find((u) => u.socketId === socket.id)) {
        room.users.push({
          socketId: socket.id,
          user,
        });
      }

      // Notify others in room
      socket.to(roomId).emit('recruiterUserJoined', { user, socketId: socket.id });

      // Send initial room state
      socket.emit('recruiterRoomState', {
        users: room.users,
        code: room.code,
      });
    });

    // WebRTC Video & Audio Signaling
    socket.on('recruiterOffer', ({ roomId, offer, targetSocketId }) => {
      socket.to(targetSocketId || roomId).emit('recruiterOffer', {
        offer,
        senderSocketId: socket.id,
      });
    });

    socket.on('recruiterAnswer', ({ roomId, answer, targetSocketId }) => {
      socket.to(targetSocketId || roomId).emit('recruiterAnswer', {
        answer,
        senderSocketId: socket.id,
      });
    });

    socket.on('recruiterIceCandidate', ({ roomId, candidate, targetSocketId }) => {
      socket.to(targetSocketId || roomId).emit('recruiterIceCandidate', {
        candidate,
        senderSocketId: socket.id,
      });
    });

    // Real-time Shared Coding
    socket.on('recruiterCodeUpdate', ({ roomId, code }) => {
      if (recruiterRooms[roomId]) {
        recruiterRooms[roomId].code = code;
      }
      socket.to(roomId).emit('recruiterCodeSync', { code });
    });

    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        if (recruiterRooms[roomId]) {
          recruiterRooms[roomId].users = recruiterRooms[roomId].users.filter(
            (u) => u.socketId !== socket.id
          );
          socket.to(roomId).emit('recruiterUserLeft', { socketId: socket.id });
        }
      }
    });
  });
};
