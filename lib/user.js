'use strict';

const EventEmitter = require('events');
const q = require("q");

//start sooda
class User extends EventEmitter{
  constructor(socket, app, id, name, type) {
    super();
    if(!socket)
      throw "Must attach a valid socket";
    if(!app)
      throw "Must provide an app name";
    if(!id)
      throw "Must provide an id";
    if(!name)
      throw "Must provide an name";

    this.socket = socket;
    const type_ =  type ? type : 'anon';
    const username = id + ':' + name + ':' + type_;
    this.user = {
      username : username,
      type : type_
    };

    const that = this;

    socket.on('messageCompleted', function(message){
      that.emit('message', message);
    });

    socket.on('joined', function(username){
      that.emit('joined', username);
    });

    socket.on('left', function(username){
      that.emit('left', username);
    });
  }
}

const functions = ['create', 'delete', 'join', 'leave', 'users', 'message', 'messages', 'rooms'];

functions.forEach(function(func){
  User.prototype[func] = function(input, message){
    const socket = this.socket;
    const user = this.user;
    const deferred = q.defer();

    //once created return the promise
    socket.on(func + 'Completed', function(out,err){
      if(err) {
        deferred.reject(err);
      }
      deferred.resolve(out);
    });

    socket.emit(func, input, user, message);

    return deferred.promise;
  };
});

//browserify support
if(typeof window !== 'undefined') {
  window.SoodaUser = User;
}

module.exports = User;