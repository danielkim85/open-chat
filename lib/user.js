'use strict';

const q = require("q");
const user = exports = module.exports = {};

//start sooda
// TODO ensure user uniqueness
user.init = function init(socket,app,name) {
  if(!socket)
    throw "Must attach a valid socket";
  if(!app)
    throw "Must provide an app name";
  if(!name)
    throw "Must provide a name";

  this.socket = socket;
  this.info = {
    name : name
  };

  return this;
};

// TODO create below functions into one
// user = ['create','join',etc']
// user.forEach( this = oneFunction );

//create a room
user.create = function(roomName){
  const that = this;
  const socket = that.socket;
  const deferred = q.defer();

  //once created return the promise
  socket.on('created', function(roomName,err){
    if(err) {
      deferred.reject(err);
    }
    deferred.resolve(roomName);
  });

  socket.emit('create', roomName);
  return deferred.promise;
};

//delete a room
user.delete = function(roomName){
  const that = this;
  const socket = that.socket;
  const deferred = q.defer();

  //once created return the promise
  socket.on('deleted', function(roomName,err){
    if(err) {
      deferred.reject(err);
    }
    deferred.resolve(roomName);
  });

  socket.emit('delete', roomName);
  return deferred.promise;
};

//join a room
user.join = function(roomName){
  const that = this;
  const socket = that.socket;
  const deferred = q.defer();

  //once created return the promise
  socket.on('joined', function(roomSize,err){
    if(err) {
      deferred.reject(err);
    }
    deferred.resolve(roomSize);
  });

  socket.emit('join', this.info, roomName);
  return deferred.promise;
};

//show users in a room
user.users = function(roomName){
  const socket = this.socket;
  const deferred = q.defer();

  socket.on('users', function(users){
    deferred.resolve(users);
  });
  socket.emit('getUsers', roomName);
  return deferred.promise;
};