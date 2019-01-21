'use strict';

const EventEmitter = require('events');
const q = require("q");

//start sooda
class User extends EventEmitter{
  constructor(socket, app, username) {
    super();
    if(!socket)
      throw "Must attach a valid socket";
    if(!app)
      throw "Must provide an app name";
    if(!username)
      throw "Must provide a name";

    this.socket = socket;
    this.username = username;

    const that = this;

    socket.on('messageCompleted', function(message){
      that.emit('message', message);
    });
  }
}

const functions = ['create', 'delete', 'join', 'leave', 'users', 'message', 'messages'];

functions.forEach(function(func){
  User.prototype[func] = function(input, message){
    const that = this;
    const socket = that.socket;
    const deferred = q.defer();

    //once created return the promise
    socket.on(func + 'Completed', function(out,err){
      if(err) {
        deferred.reject(err);
      }
      deferred.resolve(out);
    });

    socket.emit(func, input, this.username, message);

    return deferred.promise;
  };
});

//browserify support
if(typeof window !== 'undefined') {
  window.SoodaUser = User;
}

module.exports = User;