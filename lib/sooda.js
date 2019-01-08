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
  //const messages_s = ':messages';

  //create redis client
  const redisClient = redis.createClient();

  //create app entry in redis
  //TODO check for duplicate
  redisClient.hmset(that.appName,{
    active:1,
  });

  //helper functions to remove a key
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

  //attach http server to socket io
  const io = require('socket.io')(http);
  io.on('connection', function(socket){
    that.socket = socket;

    //on creating a room
    socket.on('create', function(roomName){
      //TODO what actually needs to be done?
      //TODO add to rooms list
      const redisKey = appName + ':' + roomName + info_s;
      redisClient.hget(redisKey,'active', function(err, value){
        if(err) {
          socket.emit('created', roomName, err);
          return;
        }
        //check if the room name already exists
        if(!value){
          redisClient.hmset(redisKey,{
            active:1,
          });
          socket.emit('created', roomName);
        }
        else
          socket.emit('created', roomName, 'Duplicate room name exists');
      });
    });

    //on removing a room/
    socket.on('delete', async function(roomName) {
      //TODO check ownership
      try {
        await removeKey(roomName, info_s);
        await removeKey(roomName, users_s);
        socket.emit('deleted', roomName);
      } catch(e){
        socket.emit('deleted', roomName, 'Could not delete the room due to : ' + e);
      }
    });

    //on joining a room
    socket.on('join', function(user,roomName){
      const redisKey = appName + ':' + roomName + users_s;
      redisClient.rpush(redisKey, JSON.stringify({name:user.name}), function(err, value){
        if(err) {
          socket.emit('joined', roomName, err);
          return;
        }
        socket.emit('joined',value);
      });
    });

    socket.on('getUsers', function(roomName){
      const redisKey = appName + ':' + roomName + users_s;
      redisClient.lrange(redisKey, 0, -1, function(err, value){
        let users = [];
        value.forEach(function(v){
          users.push(JSON.parse(v));
        });
        socket.emit('users', users);
      });
    });

    //emit server is up
    socket.emit('connected');

  });
};