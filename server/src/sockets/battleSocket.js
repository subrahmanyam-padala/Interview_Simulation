import { Server } from 'socket.io';
import Battle from '../models/Battle.js';

const rooms = {};

const mockProblem = {
  title: 'Two Sum',
  description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\nYou can return the answer in any order.',
  testCases: [
    { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' },
    { input: '[3,2,4]\n6', expectedOutput: '[1,2]' },
    { input: '[3,3]\n6', expectedOutput: '[0,1]' },
  ],
  starterCode: {
    javascript: 'function twoSum(nums, target) {\n  // Write your code here\n}',
    python: 'def twoSum(nums, target):\n    # Write your code here\n    pass',
    java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n    }\n}',
    cpp: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n    }\n};',
    c: 'int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    // Write your code here\n}'
  }
};

export const initBattleSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Battle socket connected:', socket.id);

    socket.on('joinBattle', async ({ roomId, user }) => {
      socket.join(roomId);

      if (!rooms[roomId]) {
        rooms[roomId] = {
          roomId,
          players: [],
          status: 'waiting', // waiting, ongoing, completed
          problem: mockProblem,
          startTime: null,
          timerInterval: null
        };
      }

      const room = rooms[roomId];

      const existingPlayer = room.players.find(p => p.userId === user._id);
      if (!existingPlayer && room.players.length < 2) {
        room.players.push({
          userId: user._id,
          name: user.name,
          socketId: socket.id,
          status: 'Joined', // Joined, Coding, Submitted, Passed
          code: '',
          language: 'javascript',
          executionTime: null,
          submissionTime: null,
          passedTestCases: 0,
          score: 0
        });
      }

      io.to(roomId).emit('roomUpdate', {
        roomId: room.roomId,
        players: room.players,
        status: room.status,
        problem: room.status === 'ongoing' ? room.problem : null,
      });

      if (room.players.length === 2 && room.status === 'waiting') {
        room.status = 'ongoing';
        room.startTime = Date.now();
        
        io.to(roomId).emit('battleStarted', {
          problem: room.problem,
          startTime: room.startTime,
          duration: 30 * 60, // 30 minutes in seconds
        });

        // Set status to Coding for all players
        room.players.forEach(p => p.status = 'Coding');
        io.to(roomId).emit('roomUpdate', {
          roomId: room.roomId,
          players: room.players,
          status: room.status
        });
      }
    });

    socket.on('codeUpdate', ({ roomId, code, language }) => {
      const room = rooms[roomId];
      if (room) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          player.code = code;
          player.language = language;
        }
      }
    });

    socket.on('submitCode', async ({ roomId, executionTime, passedTestCases, totalTestCases }) => {
      const room = rooms[roomId];
      if (room) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          player.status = passedTestCases === totalTestCases ? 'Passed' : 'Submitted';
          player.executionTime = executionTime;
          player.submissionTime = Date.now();
          player.passedTestCases = passedTestCases;
          
          io.to(roomId).emit('roomUpdate', {
            roomId: room.roomId,
            players: room.players,
            status: room.status
          });

          // Check if both submitted or one passed all
          const allSubmitted = room.players.every(p => p.status === 'Passed' || p.status === 'Submitted');
          
          if (allSubmitted || player.status === 'Passed') {
            room.status = 'completed';
            
            // Determine winner
            let winner = null;
            if (room.players[0].status === 'Passed' && room.players[1].status === 'Passed') {
              // Both passed, check execution time or submission time
              if (room.players[0].executionTime < room.players[1].executionTime) {
                winner = room.players[0];
              } else {
                winner = room.players[1];
              }
            } else if (room.players[0].status === 'Passed') {
              winner = room.players[0];
            } else if (room.players[1].status === 'Passed') {
              winner = room.players[1];
            } else {
              // Whoever passed more test cases
              if (room.players[0].passedTestCases > room.players[1].passedTestCases) {
                winner = room.players[0];
              } else if (room.players[1].passedTestCases > room.players[0].passedTestCases) {
                winner = room.players[1];
              }
            }

            const endTime = Date.now();

            io.to(roomId).emit('battleEnded', {
              winner: winner ? winner.userId : null,
              players: room.players,
            });

            // Save to DB
            try {
               await Battle.create({
                 roomId,
                 players: room.players,
                 problem: room.problem,
                 winner: winner ? winner.userId : null,
                 status: 'completed',
                 startTime: room.startTime,
                 endTime,
               });
            } catch (err) {
               console.error('Error saving battle:', err);
            }
            delete rooms[roomId];
          }
        }
      }
    });

    socket.on('disconnect', () => {
      // Handle player disconnect logic if necessary
      console.log('Battle socket disconnected:', socket.id);
    });
  });
};
