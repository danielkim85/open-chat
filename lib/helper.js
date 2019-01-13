'use strict';

const helper = exports = module.exports = {};

helper.init = function(redisClient, appName){
  this.redisClient = redisClient;
  this.appName = appName;
};

//helper function to remove a key
helper.removeKey = function(roomName, keySuffix){
  return new Promise((resolve,reject) => {
    const redisKey = this.appName + ':' + roomName + keySuffix;
    this.redisClient.del(redisKey, function(err, response) {
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

//helper function to push value to range
helper.rpush = function(roomName, keySuffix, username){
  return new Promise((resolve,reject) => {
    const redisKey = this.appName + ':' + roomName + keySuffix;

    this.redisClient.rpush(redisKey, username, function (err, value) {
      if (err) {
        reject(err);
      }
      resolve(value);
    });

  });
};

//helper function to get range
helper.getRange = function(roomName, keySuffix, rangeSize){
  const rangeSize_ = rangeSize ? rangeSize : -1;
  return new Promise((resolve,reject) => {
    const redisKey = this.appName + ':' + roomName + keySuffix;
    this.redisClient.lrange(redisKey, 0, rangeSize_, function(err, value){
      if(err){
        reject(err);
      }
      resolve(value);
    });

  });
};

//helper function to get set
helper.getKey = function(roomName, keySuffix, key){
  return new Promise((resolve,reject) => {
    const redisKey = this.appName + ':' + roomName + keySuffix;
    this.redisClient.hget(redisKey, key, function(err, value){
      if(err) {
        reject(err);
      }
      resolve(value);
    });
  });
};