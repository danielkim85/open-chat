const app = angular.module('SoodaApp', []);

app.controller('SoodaCtrl', function ($scope) {

  const appName = 'soodaWeb';
  const roomName = 'soodaWebRoom';

  //socket
  const host =  window.location.hostname;
  const port =  host === 'localhost' ? '3000' : '443';
  const protocol = host === 'localhost' ? 'http://' : 'https://';

  $scope.username = 'anon' + Math.floor(Math.random() * 100000);
  $scope.messages = [];

  $scope.parseMsg = function(msg){
    msg = JSON.parse(msg);
    msg.isMe = msg.username === $scope.username;
    return msg;
  };

  $scope.socket = io.connect(protocol + host + ':' + port,{
    'sync disconnect on unload': true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax : 5000,
    reconnectionAttempts: Infinity
  });

  const me = new SoodaUser($scope.socket,appName,$scope.username);

  me.on('message', function(msg){
    $scope.messages.push($scope.parseMsg(msg));
    $scope.$apply();
  });

  $scope.socket.on('connect', function(){
    //ensures the login process doesn't kick off before socket is connected.
    me.join(roomName).then(
      function(){
        me.messages(roomName).then(function(messages){
          let parsedMessages = [];
          messages.forEach(function(msg){
            parsedMessages.push($scope.parseMsg(msg));
          });
          $scope.messages = parsedMessages;
          $scope.$apply();
        });
        me.users(roomName).then(function(users){
          $scope.users = users;
          $scope.$apply();
        });
      }, function(err){
        console.error(err);
      }
    );
  });

  $scope.send = function(message){
    $scope.message = '';
    me.message(roomName,message);
  };

  //clean up after disconnect
  window.onbeforeunload = function() {
    //leave the room
    me.leave(roomName);
    return undefined;
  };
});