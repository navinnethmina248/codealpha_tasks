require('dotenv').config();
const http = require('http');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const app = require('./app');

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(PORT, () => {
    console.log(`TaskFlow running on http://localhost:${PORT}`);
  });
})();
