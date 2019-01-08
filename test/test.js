const sooda = require('../lib/sooda');
const soodaUser = require('../lib/user');

//kick off express server
const app = require('express')();
const http = require('http').Server(app);

const appName = 'soodaTest';

http.listen(3000, function(){
  console.log('listening on *:3000');

  //kick off sooda
  sooda.init(http, appName);

  //client connection test
  const io = require('socket.io-client');
  const socket = io.connect('http://localhost:3000');

  //create a test user
  console.log('creating a test user john1');
  const user1 = soodaUser.init(socket,appName,'john1');

  //create a test user
  console.log('creating a test user john2');
  const user2 = soodaUser.init(socket,appName,'john2');

  //connect and begin testing
  socket.once('connected', function(){

    console.log('connected to sooda server');

    const roomName = 'test1';

    //fire the test!
    user1.create(roomName).then(
      function(roomName){
        console.log('Created a room : ' + roomName);
        return user1.join(roomName);
      }, function(err){
        console.error('Error while creating a room : ' + err);
      }
    ).then(
      function(roomSize){
        console.log('user1 joined a room. Current room size : ' + roomSize);
        return user2.join(roomName);
      }, function(err){
        console.error('Error while user1 joining a room : ' + err);
      }
    ).then(
      function(roomSize){
        console.log('user2 joined a room. Current room size : ' + roomSize);
        return user1.delete(roomName);
      }, function(err){
        console.error('Error while user2 joining a room : ' + err);
      }
    ).then(
      function(roomName){
        console.log('Deleted a room : ' + roomName);
        //exit here
        process.exit(0);
      }, function(err){
        console.error('Error while deleting a room : ' + err);
      }
    );
  });
});