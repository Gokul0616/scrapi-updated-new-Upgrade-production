/**
 * WebSocket utility functions for real-time updates
 */

let io = null;

/**
 * Initialize Socket.IO instance
 */
function initializeSocket(socketIO) {
  io = socketIO;
}

/**
 * Get Socket.IO instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
}

/**
 * Emit run status update to specific user
 */
function emitRunUpdate(userId, runData) {
  if (io) {
    io.to(`user:${userId}`).emit('run:update', runData);
    console.log(`📡 Emitted run:update to user:${userId}`);
  }
}

/**
 * Emit run status update to specific run room
 */
function emitRunStatusChange(runId, status, data = {}) {
  if (io) {
    io.to(`run:${runId}`).emit('run:status', {
      runId,
      status,
      ...data,
      timestamp: new Date().toISOString()
    });
    console.log(`📡 Emitted run:status for run:${runId} - status: ${status}`);
  }
}

/**
 * Emit new run created notification
 */
function emitRunCreated(userId, runData) {
  if (io) {
    io.to(`user:${userId}`).emit('run:created', runData);
    console.log(`📡 Emitted run:created to user:${userId}`);
  }
}

/**
 * Emit run completed notification
 */
function emitRunCompleted(userId, runId, runData) {
  if (io) {
    io.to(`user:${userId}`).emit('run:completed', {
      runId,
      ...runData,
      timestamp: new Date().toISOString()
    });
    io.to(`run:${runId}`).emit('run:completed', {
      runId,
      ...runData,
      timestamp: new Date().toISOString()
    });
    console.log(`📡 Emitted run:completed for run:${runId}`);
  }
}

/**
 * Emit run failed notification
 */
function emitRunFailed(userId, runId, error) {
  if (io) {
    io.to(`user:${userId}`).emit('run:failed', {
      runId,
      error,
      timestamp: new Date().toISOString()
    });
    io.to(`run:${runId}`).emit('run:failed', {
      runId,
      error,
      timestamp: new Date().toISOString()
    });
    console.log(`📡 Emitted run:failed for run:${runId}`);
  }
}

/**
 * Emit progress update
 */
function emitRunProgress(runId, userId, progress) {
  if (io) {
    const progressData = {
      runId,
      progress,
      timestamp: new Date().toISOString()
    };
    io.to(`run:${runId}`).emit('run:progress', progressData);
    io.to(`user:${userId}`).emit('run:progress', progressData);
    console.log(`📡 Emitted run:progress for run:${runId} - ${progress}%`);
  }
}

module.exports = {
  initializeSocket,
  getIO,
  emitRunUpdate,
  emitRunStatusChange,
  emitRunCreated,
  emitRunCompleted,
  emitRunFailed,
  emitRunProgress
};
