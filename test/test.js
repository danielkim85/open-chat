const sooda = require('../lib/sooda');
const SoodaUser = require('../lib/user');

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
  const user1 = new SoodaUser(socket,appName,'john1');

  //create a test user
  console.log('creating a test user john2');
  const user2 = new SoodaUser(socket,appName,'john2');

  //connect and begin testing
  socket.once('connected', function(){

    console.log('connected to sooda server');

    const roomName = 'test1';

    //custom event -- message
    user1.on('message', function(msg){
      console.info('user 1 received message : ' + msg);
    });
    user2.on('message', function(msg){
      console.info('user 2 received message : ' + msg);
    });

    //custom event -- joined
    user1.on('joined', function(user){
      console.info('user 1 received join notification : ' + user.username);
    });
    user2.on('joined', function(user){
      console.info('user 2 received join notification : ' + user.username);
    });

    //custom event -- left
    user1.on('left', function(user){
      console.info('user 1 received left notification : ' + user.username);
    });
    user2.on('left', function(user){
      console.info('user 2 received left notification : ' + user.username);
    });

    //fire the test!

    //create a room
    user1.create(roomName).then(
      function(roomName){
        console.log('Created a room : ' + roomName);

        //user 1 joins
        return user1.join(roomName);
      }, function(err){
        console.error('Error while creating a room : ' + err);
      }
    ).then(
      function(user){
        console.log(user.username + ' joined a room. Current room size');

        //user 1 joins AGAIN
        return user1.join(roomName);
      }, function(err){
        console.error('Error while user1 joining a room : ' + err);
      }
    ).then(
      function(user){
        console.log(user.username + ' tried to rejoin a room. Current room size');

        //failed ...

      }, function(err){
        console.error('Error while user1 joining a room again : ' + err);

        //user 2 joins
        return user2.join(roomName);
      }
    ).then(
      function(user){
        console.log(user.username + ' joined a room. Current room size');

        //user1 asking for users list
        return user1.users(roomName);
      }, function(err){
        console.error('Error while user2 joining a room : ' + err);
      }
    ).then(
      function(users){
        console.log('current users');
        console.log(users);

        //user2 deletes a room, shouldn't be allowed.
        return user1.message(roomName,'hello, room!');
      }, function(err){
        console.error('Error while user1 listing the users : ' + err);
        return user1.message(roomName,'hello, room!');
      }
    ).then(
      function(){
        //user2 deletes a room, shouldn't be allowed.
        return user2.message(roomName,'hello, room2!');
      }, function(err){
        console.error('Error while user1 sending message : ' + err);
        return user2.message(roomName,'hello, room2!');
      }
    ).then(
      function(){
        //user2 deletes a room, shouldn't be allowed.
        return user2.messages(roomName);
      }, function(err){
        console.error('Error while user2 sending message : ' + err);
        return user2.messages(roomName);
      }
    ).then(
      function(messages){
        //user2 deletes a room, shouldn't be allowed.
        console.info(messages);
        return user2.delete(roomName);
      }, function(err){
        console.error('Error while user2 listing messages : ' + err);
        return user2.delete(roomName);
      }
    ).then(
      function(roomName){
        console.error('User 2 deleted a room created by user 1. This should not happen');
        //user1 purges
        return user2.leave(roomName);
      }, function(err){
        console.error('Error while user 2 deleting a room : ' + err);
        return user2.leave(roomName);
      }
    ).then(
      function(){
        console.info('User 2 left ' + roomName);
        //user1 purges
        return user1.delete(roomName);
      }, function(err){
        console.error('User 2 failed to leave the room: ' + err);
        return user1.delete(roomName);
      }
    ).then(
      function(roomName){
        console.log('Deleted a room : ' + roomName);

        //exit here
        process.exit(0);
      }, function(err){
        console.error('Error while deleting a room : ' + err);
        process.exit(0);
      }
    );
  });
});