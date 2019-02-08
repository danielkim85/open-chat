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
      resolve(response);
    });
  });
};

//helper function to push value to list
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

//helper function to remove from list
helper.lrem = function(roomName, keySuffix, username){
  return new Promise((resolve,reject) => {
    const redisKey = this.appName + ':' + roomName + keySuffix;

    this.redisClient.lrem(redisKey,0, username,function (err, value) {
      if (err) {
        reject(err);
      }
      resolve(value);
    });

  });
};

//helper function to get range
helper.getRange = function(roomName, keySuffix, rangeSize){
  const rangeSize_ = rangeSize ? rangeSize*-1 : 0;
  return new Promise((resolve,reject) => {
    const redisKey = this.appName + ':' + roomName + keySuffix;
    this.redisClient.lrange(redisKey, rangeSize_, -1, function(err, value){
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

//helper function to get set
helper.getAll = function(roomName, keySuffix){
  return new Promise((resolve,reject) => {
    const redisKey = this.appName + ':' + roomName + keySuffix;
    this.redisClient.hgetall(redisKey, function(err, value){
      if(err) {
        reject(err);
      }
      resolve(value);
    });
  });
};