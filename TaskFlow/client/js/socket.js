// Real-time connection (Socket.IO). The client library is served by the TaskFlow server.
let socketPromise = null;

function getSocket() {
  if (socketPromise) return socketPromise;
  socketPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SERVER_ORIGIN + '/socket.io/socket.io.js';
    script.onload = () => resolve(io(SERVER_ORIGIN, { auth: { token: Auth.token() } }));
    script.onerror = () => reject(new Error('Could not load the real-time client'));
    document.head.appendChild(script);
  });
  return socketPromise;
}

// Listen for an event; silently does nothing if real-time is unavailable.
function onSocket(event, handler) {
  getSocket().then((s) => s.on(event, handler)).catch(() => {});
}

// Join a project room (and rejoin automatically after a reconnect).
function joinProjectRoom(projectId) {
  getSocket()
    .then((s) => {
      const join = () => s.emit('joinProject', projectId);
      s.on('connect', join);
      if (s.connected) join();
    })
    .catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.hasAttribute('data-protected') && Auth.token()) getSocket().catch(() => {});
});
