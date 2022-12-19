require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const { Server } = require('socket.io');

const apiRouter = require('./routes/api');
const liveBlockWebSocket = require('./liveBlockWebSocket');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

liveBlockWebSocket(io);

io.on('connection', () => {
  console.log('Client connected');
});

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(morgan('common'));
app.use(express.json());

app.use('/api', apiRouter(io));

app.use(express.static(path.resolve(__dirname, '..', 'build')));

app.get('*', (_req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'build', 'index.html'));
});

app.set('port', process.env.PORT || 8000);

server.listen(app.get('port'));
console.log('Listening on port:', app.get('port'));
