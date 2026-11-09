// Free real-time layer (Socket.io). No paid service required.
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');

let io = null;

const initLiveSocket = (httpServer, { corsOrigin } = {}) => {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin || true, credentials: true },
  });

  // Only logged-in users can connect (same JWT as the REST API).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || !process.env.JWT_SECRET) return next(new Error('unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.trainerSetup === true) return next(new Error('unauthorized'));
      const user = await User.findById(decoded.id).select('_id role');
      if (!user) return next(new Error('unauthorized'));
      socket.data.userId = String(user._id);
      return next();
    } catch (error) {
      return next(new Error('unauthorized'));
    }
  });

  // Each user joins ONLY their own private room. The server decides who gets
  // which event, so a client can never subscribe to someone else's location.
  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
};

const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(event, payload);
};

module.exports = { initLiveSocket, emitToUser };
