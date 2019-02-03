const app = angular.module('SoodaApp', []);

app.controller('SoodaCtrl', function ($scope) {

  let signedIn = undefined;
  let sendInProg = false;
  let me;

  function onSignIn(googleUser) {

    const profile = googleUser.getBasicProfile();
    const name =  profile.getName();
    const id = profile.getId();
    $scope.type = 'google';

    /*
    console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
    console.log('Name: ' + profile.getName());
    console.log('Image URL: ' + profile.getImageUrl());
    console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
    */

    signedIn = true;
    $('.sign-out').show();
    $('.sign-in').hide();
    $('.auth').modal('hide');

    if(sendInProg){
      $scope.send($scope.message);
      sendInProg = false;
    }

    //soodaUser already created, leave the room and rejoin.
    if(me){
      me.leave(roomName);
    }
    me = new SoodaUser($scope.socket,appName,id,name,$scope.type);
    $scope.username = id + ':' + name + ':' + $scope.type;
    me.join(roomName).then(function(){
      $scope.loadUsers(roomName);
      $scope.loadMessages(roomName);
    });
  }
  window.onSignIn = onSignIn;

  const appName = 'soodaWeb';
  let roomName = 'Lobby';
  let authMode = undefined;

  //socket
  const host =  window.location.hostname;
  const port =  host === 'localhost' ? '3000' : '443';
  const protocol = host === 'localhost' ? 'http://' : 'https://';

  const username = 'anon' + Math.floor(Math.random() * 100000);
  $scope.type  = 'anon';
  $scope.username = username + ':' + username + ':' + $scope.type;
  $scope.messages = [];

  $scope.parseMsg = function(msg){
    msg = JSON.parse(msg);
    msg.isMe = msg.user.username === $scope.username;
    return msg;
  };

  $scope.socket = io.connect(protocol + host + ':' + port,{
    'sync disconnect on unload': true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax : 5000,
    reconnectionAttempts: Infinity
  });

  me = new SoodaUser($scope.socket,appName,username,username);

  me.on('message', function(msg){
    $scope.messages.push($scope.parseMsg(msg));
    $scope.$apply();
  });

  me.on('joined', function(user){
    $scope.users.push(user);
    $scope.$apply();
  });

  me.on('left', function(user){
    $scope.users = $scope.users.filter(
      e => JSON.stringify(e) !== JSON.stringify(user)
    );
    $scope.$apply();
  });

  $scope.loadMessages = function(roomName){
    me.messages(roomName).then(function(messages){
      let parsedMessages = [];
      messages.forEach(function(msg){
        parsedMessages.push($scope.parseMsg(msg));
      });
      $scope.messages = parsedMessages;
      $scope.$apply();
    });
  };

  $scope.loadRooms = function(){
    me.rooms().then(function(rooms){
      $scope.rooms = rooms;
      $scope.$apply();
    }, function(err){
      console.error(err);
    });
  };

  $scope.loadUsers = function(roomName){
    me.users(roomName).then(function(users){
      $scope.users = users;
      $scope.$apply();
    }, function(err){
      console.error(err);
    });
  };

  $scope.socket.on('connect', function(){
    //ensures the login process doesn't kick off before socket is connected.
    me.join(roomName).then(
      function(){

        //grab previous messages
        $scope.loadMessages(roomName);

        //grab other users
        $scope.loadUsers(roomName);

        //grab other rooms
        $scope.loadRooms();

      }, function(err){
        console.error(err);
      }
    );
  });

  $scope.send = function(message){

    authMode = authMode ? authMode : signedIn;
    if(!authMode){
      sendInProg = true;
      $scope.signIn();
      return;
    }

    if(!message || message.trim() === ''){
      return;
    }

    $scope.message = '';
    me.message(roomName,message);
  };

  $scope.join = function(joinRoomName){
    $('.rooms .item').removeClass('active');
    $('.rooms .item[room-name="' + joinRoomName + '"]').addClass('active');
    me.leave(roomName);
    me.join(joinRoomName).then(function(){
      roomName = joinRoomName;
      $scope.loadUsers(roomName);
      $scope.loadMessages(roomName);
    }, function(e){
      console.error(e);
    });
  };

  $scope.createRoom = function(){
    $('.create-room').modal('show');
  };

  $scope.doCreateRoom = function(createRoomName){
    me.create(createRoomName).then(function(){
      $('.create-room').modal('hide');
      $scope.loadRooms();
    }, function(err){
      console.error(err);
    });
  };

  $scope.cancelCreateRoom = function(){
    $('.create-room').modal('hide');
  };

  $scope.useAnon = function(){
    authMode = 'anon';
    $('.auth').modal('hide');
    if(sendInProg){
      $scope.send($scope.message);
      sendInProg = false;
    }
  };

  $scope.signIn = function(){
    $('.auth').modal('show');
  };

  $scope.signOut = function(){
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
      signedIn = authMode = false;
      $('.sign-out').hide();
      $('.sign-in').show();
    });
  };

  $('input[type=text]').on('keydown', function(e) {
    if (e.which === 13) {
      $scope.send($scope.message);
      e.preventDefault();
    }
  });

  //clean up after disconnect
  window.onbeforeunload = function() {
    //leave the room
    me.leave(roomName);
    return undefined;
  };
});