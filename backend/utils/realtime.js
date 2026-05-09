const jwt = require('jsonwebtoken');

function createRealtimeServer(io) {
  const userSockets = new Map();

  function addSocket(userId, socket) {
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket);
  }

  function removeSocket(userId, socket) {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    sockets.delete(socket);
    if (sockets.size === 0) {
      userSockets.delete(userId);
    }
  }

  function broadcastToUser(userId, event, data) {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    sockets.forEach((socket) => {
      socket.emit(event, data);
    });
  }

  function broadcastError(userId, errorData) {
    broadcastToUser(userId, 'new_error', errorData);
  }

  function broadcastFix(userId, fixData) {
    broadcastToUser(userId, 'fix_generated', fixData);
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded?.user?.id;
      if (!socket.userId) {
        return next(new Error('Invalid token'));
      }
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    
    addSocket(userId, socket);
    console.log(`User ${userId} connected to real-time error stream`);

    socket.emit('connected', {
      message: 'Real-time error stream connected successfully',
      timestamp: new Date().toISOString()
    });

    socket.on('disconnect', () => {
      removeSocket(userId, socket);
      console.log(`User ${userId} disconnected from real-time error stream`);
    });

    socket.on('error', (err) => {
      console.error(`Socket error for user ${userId}:`, err);
      removeSocket(userId, socket);
    });
  });

  return {
    broadcastToUser,
    broadcastError,
    broadcastFix,
    io
  };
}

module.exports = { createRealtimeServer };
