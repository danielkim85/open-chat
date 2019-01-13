'use strict';

const sooda = exports = module.exports = {};
const redis = require("redis");

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
  //const messages_s = ':messages';

  //create redis client
  const redisClient = redis.createClient();

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

  //helper function to remove a key
  const removeKey = function(roomName, keySuffix){
    return new Promise((resolve,reject) => {
      const redisKey = appName + ':' + roomName + keySuffix;
      redisClient.del(redisKey, function(err, response) {
        if(err){
          reject(err);
        }
        if(response === 1){
          resolve(response);
        }
        else{
          reject('Unknown error occured while removing : ' + redisKey);
        }
      });
    });
  };

  //helper function to get range
  const getRange = function(roomName, keySuffix){
    return new Promise((resolve,reject) => {
      const redisKey = appName + ':' + roomName + keySuffix;
      redisClient.lrange(redisKey, 0, -1, function(err, value){
        if(err){
          reject(err);
        }
        resolve(value);
      });

    });
  };

  //helper function to get set
  const getKey = function(roomName, keySuffix, key){
    return new Promise((resolve,reject) => {
      const redisKey = appName + ':' + roomName + keySuffix;
      redisClient.hget(redisKey, key, function(err, value){
        if(err) {
          reject(err);
        }
        resolve(value);
      });
    });
  };

  //attach http server to socket io
  const io = require('socket.io')(http);
  io.on('connection', function(socket){
    that.socket = socket;

    //on creating a room
    socket.on('create', function(roomName,username){
      const redisKey = appName + ':' + roomName + info_s;
      redisClient.hget(redisKey,'active', function(err, value){
        if(err) {
          socket.emit('createCompleted', roomName, err);
          return;
        }
        //check if the room name already exists
        if(!value){
          redisClient.hmset(redisKey,{
            active:1,
            owner:username
          });
          socket.emit('createCompleted', roomName);
        }
        else
          socket.emit('createCompleted', roomName, 'Duplicate room name exists');
      });
    });

    //on removing a room/
    socket.on('delete', async function(roomName,username) {
      try {
        const owner = await getKey(roomName, info_s, 'owner');
        if(owner !== username){
          socket.emit('deleteCompleted', roomName, 'Could not delete the room due to ownership mismatch');
          return;
        }
      } catch(e){
        socket.emit('deleteCompleted', roomName, 'Could not delete the room due to : ' + e);
        return;
      }

      try {
        await removeKey(roomName, info_s);
        await removeKey(roomName, users_s);
        socket.emit('deleteCompleted', roomName);
      } catch(e){
        socket.emit('deleteCompleted', roomName, 'Could not delete the room due to : ' + e);
      }
    });

    //on joining a room
    socket.on('join', function(roomName,username){
      const redisKey = appName + ':' + roomName + users_s;
      return new Promise(async (resolve,reject) => {
        const users = await getRange(roomName,users_s);
        if(users.indexOf(username) === -1) {
          resolve();
        }
        else{
          reject('Duplicate username in the room.');
        }
      }).then(() => {
        redisClient.rpush(redisKey, username, function (err, value) {
          if (err) {
            socket.emit('joinCompleted', roomName, err);
            return;
          }
          socket.emit('joinCompleted', value);
        });
      }, (err) => {
        socket.emit('joinCompleted', roomName, err);
      });
    });

    socket.on('users', async function(roomName){
      try {
        const users = await getRange(roomName, users_s);
        socket.emit('usersCompleted', users);
      } catch(e){
        socket.emit('usersCompleted', roomName, 'Could not list the users due to : ' + e);
      }
    });

    //emit server is up
    socket.emit('connected');

  });
};