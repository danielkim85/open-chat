'use strict';

const sooda = exports = module.exports = {};

sooda.ping = function ping(clientSocket) {
  const socket = this.socket;
  socket.on('ping!', function(msg){
    if(msg === 'ping')
      socket.emit('pong!', 'pong');
  });
  clientSocket.emit('ping!', 'ping');
};

sooda.init = function init(http) {

  const that = this;

  //attach http server to socket io
  const io = require('socket.io')(http);
  console.log('sooda started');

  io.on('connection', function(socket){
    that.socket = socket;
    socket.emit('connected');
  });
};