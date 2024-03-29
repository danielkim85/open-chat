'use strict';

const sooda = exports = module.exports = {};
const helper = require('./helper.js');
const redis = require('redis');

//start sooda
sooda.init = function init(http,app) {

  if(!http)
    throw "Must attach a valid http server";
  if(!app)
    throw "Must provide an app name";

  const that = this;
  const appName = that.appName = 'sooda:' + app;

  //suffix definitions
  const info_s = ':info';
  const users_s = ':users';
  const rooms_s = ':rooms';
  const messages_s = ':messages';

  //create redis client
  const redisClient = redis.createClient();


  //start helper
  helper.init(redisClient, appName);

  //create app entry in redis

  redisClient.hget(that.appName,'active', function(err, value){
    if(err) {
      throw err;
    }
    //check if the room name already exists
    if(!value){
      redisClient.hmset(that.appName,{
        active:1,
      });
    }
    else{
      console.warn('existing app exists ... reusing.');
    }
  });

  //attach http server to socket io
  const io = require('socket.io')(http);
  io.on('connection', function(socket){
    that.socket = socket;

    //on creating a room
    socket.on('create', async function(roomName,user){

      return new Promise(async (resolve,reject) => {
        const rooms = await helper.getRange('',rooms_s);
        if(rooms.indexOf(roomName) === -1) {
          await helper.rpush('', rooms_s, roomName);
          resolve();
        }
        else{
          reject('Duplicate room name.');
        }
      }).then(async() => {
        try {
          const redisKey = appName + ':' + roomName + info_s;
          redisClient.hmset(redisKey,{
            active:1,
            owner:JSON.stringify(user)
          }, function(){
            socket.emit('createCompleted', roomName);
          });
        } catch(e){
          socket.emit('createCompleted', roomName, e);
        }
      }, (err) => {
        socket.emit('createCompleted', roomName, err);
      });

    });

    //on removing a room/
    socket.on('delete', async function(roomName,user) {
      try {
        const owner = await helper.getKey(roomName, info_s, 'owner');
        if(owner !== JSON.stringify(user)){
          socket.emit('deleteCompleted', roomName, 'Could not delete the room due to ownership mismatch');
          return;
        }
      } catch(e){
        socket.emit('deleteCompleted', roomName, 'Could not delete the room due to : ' + e);
        return;
      }

      try {
        await helper.lrem('', rooms_s, roomName);

        await helper.removeKey(roomName, info_s);
        await helper.removeKey(roomName, users_s);
        await helper.removeKey(roomName, messages_s);
        socket.emit('deleteCompleted', roomName);
        socket.broadcast.to(roomName).emit('deleted', roomName);
      } catch(e){
        socket.emit('deleteCompleted', roomName, 'Could not delete the room due to : ' + e);
      }
    });

    //on getting room/
    socket.on('room', async function(roomName) {
      try {
        const room = await helper.getAll(roomName, info_s);
        socket.emit('roomCompleted', room);
      } catch(e){
        socket.emit('roomCompleted', roomName, 'Could not get the room info due to : ' + e);
      }
    });

    //on listring rooms/
    socket.on('rooms', async function() {
      try {
        const rooms = await helper.getRange('', rooms_s);
        let ret = [];
        rooms.forEach(function(room){
          ret.push(room);
        });
        socket.emit('roomsCompleted', ret);
      } catch(e){
        socket.emit('roomsCompleted', '', e);
      }
    });

    //on joining a room
    socket.on('join', function(roomName,user){
      const user_ =  JSON.stringify(user);
      return new Promise(async (resolve,reject) => {
        const users = await helper.getRange(roomName,users_s);
        if(users.indexOf(user_) === -1) {
          resolve();
        }
        else{
          reject('Duplicate username in the room.');
        }
      }).then(async() => {
        try {
          await helper.rpush(roomName, users_s, user_);
          socket.join(roomName);
          socket.broadcast.to(roomName).emit('joined', user);
          socket.emit('joinCompleted', user);
        } catch(e){
          socket.emit('joinCompleted', user, "Join failed due to : " + e);
        }
      }, (err) => {
        socket.emit('joinCompleted', user, err);
      });
    });

    //on leaving a room
    socket.on('leave', function(roomName,user){
      const user_ =  JSON.stringify(user);
      return new Promise(async (resolve,reject) => {
        const users = await helper.getRange(roomName,users_s);
        if(users.indexOf(user_) === -1) {
          reject('Username not in the room.');
        }
        else{
          resolve();
        }
      }).then(async() => {
        try {
          await helper.lrem(roomName, users_s, user_);
          socket.broadcast.to(roomName).emit('left', user);
          socket.emit('leaveCompleted', user);
          socket.leave(roomName);
        } catch(e){
          socket.emit('leaveCompleted', user, "Leave failed due to : " + e);
        }
      }, (err) => {
        socket.emit('leaveCompleted', user, err);
      });
    });

    //on receiving a message
    socket.on('message', function(roomName,user,message){
      const message_ = JSON.stringify({
        user:user,
        message:message
      });
      return new Promise(async (resolve,reject) => {
        try {
          const messageSize = await helper.rpush(roomName, messages_s, message_);
          resolve(messageSize);
        }
        catch (e){
          reject(e);
        }
      }).then(async() => {
        io.to(roomName).emit('messageCompleted', message_);
      }, (err) => {
        socket.emit('messageCompleted', roomName, err);
      });
    });

    socket.on('messages', async function(roomName, user, rangeSize){
      rangeSize = rangeSize ? rangeSize : 5;
      try {
        const messages = await helper.getRange(roomName, messages_s, rangeSize);
        socket.emit('messagesCompleted', messages);
      } catch(e){
        socket.emit('messagesCompleted', roomName, 'Could not list the messages due to : ' + e);
      }
    });

    socket.on('users', async function(roomName){
      try {
        const users = await helper.getRange(roomName, users_s);
        const owner = JSON.parse(await helper.getKey(roomName, info_s, 'owner'));
        let ret = [];
        users.forEach(function(user){
          let jsonUser = JSON.parse(user);
          jsonUser.isAdmin = jsonUser.username === owner.username;
          ret.push(jsonUser);
        });
        socket.emit('usersCompleted', ret);
      } catch(e){
        socket.emit('usersCompleted', roomName, 'Could not list the users due to : ' + e);
      }
    });

    //emit server is up
    socket.emit('connected');

  });
};