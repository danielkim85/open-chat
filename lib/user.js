'use strict';

const q = require("q");

//start sooda
function User(socket,app,username) {
  if(!socket)
    throw "Must attach a valid socket";
  if(!app)
    throw "Must provide an app name";
  if(!username)
    throw "Must provide a name";

  this.socket = socket;
  this.username = username;

}

const functions = ['create', 'delete', 'join', 'users'];

functions.forEach(function(func){
  User.prototype[func] = function(input){
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
    socket.emit(func, input, this.username);
    return deferred.promise;
  };
});

module.exports = User;