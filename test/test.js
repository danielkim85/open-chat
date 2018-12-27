const sooda = require('../lib/sooda');

//kick off express server
const app = require('express')();
const http = require('http').Server(app);

http.listen(3000, function(){
  console.log('listening on *:3000');

  //kick off sooda
  sooda.init(http);

  //client connection test
  const io = require('socket.io-client');
  const socket = io.connect('http://localhost:3000');

  //connect and begin testing
  socket.once('connected', function(){
    //ping test
    sooda.ping(socket);

    //terminate after pong!
    socket.on('pong!',function(msg){
      console.info(msg);
      console.warn('terminating ...');
      process.exit(0);
    })
  });
});