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
  //activate this later
  //TODO : need the messaging logic
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
    socket.on('create', async function(roomName,username){

      try {
        const isActive = await helper.getKey(roomName, info_s, 'active');
        if(isActive){
          socket.emit('createCompleted', roomName, 'Duplicate room name exists');
          return;
        }
      } catch(e){
        socket.emit('createCompleted', roomName, 'Could not create the room due to : ' + e);
        return;
      }

      const redisKey = appName + ':' + roomName + info_s;
      redisClient.hmset(redisKey,{
        active:1,
        owner:username
      }, function(){
        socket.emit('createCompleted', roomName);
      });
    });

    //on removing a room/
    socket.on('delete', async function(roomName,username) {
      try {
        const owner = await helper.getKey(roomName, info_s, 'owner');
        if(owner !== username){
          socket.emit('deleteCompleted', roomName, 'Could not delete the room due to ownership mismatch');
          return;
        }
      } catch(e){
        socket.emit('deleteCompleted', roomName, 'Could not delete the room due to : ' + e);
        return;
      }

      try {
        await helper.removeKey(roomName, info_s);
        await helper.removeKey(roomName, users_s);
        await helper.removeKey(roomName, messages_s);
        socket.emit('deleteCompleted', roomName);
      } catch(e){
        socket.emit('deleteCompleted', roomName, 'Could not delete the room due to : ' + e);
      }
    });

    //on joining a room
    socket.on('join', function(roomName,username){
      return new Promise(async (resolve,reject) => {
        const users = await helper.getRange(roomName,users_s);
        if(users.indexOf(username) === -1) {
          resolve();
        }
        else{
          reject('Duplicate username in the room.');
        }
      }).then(async() => {
        try {
          const roomSize = await helper.rpush(roomName, users_s, username);
          socket.emit('joinCompleted', roomSize);
        } catch(e){
          socket.emit('joinCompleted', roomName, "Join failed due to : " + e);
        }
      }, (err) => {
        socket.emit('joinCompleted', roomName, err);
      });
    });

    //on receiving a message
    socket.on('message', function(roomName,username,message){
      const message_ = username + ':' + message;
      return new Promise(async (resolve,reject) => {
        try {
          const messageSize = await helper.rpush(roomName, messages_s, message_);
          resolve(messageSize);
        }
        catch (e){
          reject(e);
        }
      }).then(async(messageSize) => {
        socket.emit('messageCompleted', messageSize);
        io.sockets.emit('message', message_);
      }, (err) => {
        socket.emit('messageCompleted', roomName, err);
      });
    });

    socket.on('messages', async function(roomName){
      try {
        const messages = await helper.getRange(roomName, messages_s, 5);
        socket.emit('messagesCompleted', messages);
      } catch(e){
        socket.emit('messagesCompleted', roomName, 'Could not list the messages due to : ' + e);
      }
    });

    socket.on('users', async function(roomName){
      try {
        const users = await helper.getRange(roomName, users_s);
        socket.emit('usersCompleted', users);
      } catch(e){
        socket.emit('usersCompleted', roomName, 'Could not list the users due to : ' + e);
      }
    });

    //emit server is up
    socket.emit('connected');

  });
};