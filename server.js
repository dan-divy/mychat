// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var Enmap = require('enmap')
var db = new Enmap({name: 'msgs'})

server.listen(port, async () => {
  await db.defer
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {

  
  return res.redirect('/request')

})

app.get('/:room', (req, res) => {
  if(req.params.room == 'request' || !req.params) {
    return res.sendFile(__dirname + '/public/room.html');
  } else {
    return res.sendFile(__dirname + '/public/main.html')
  }
})

app.get('/d/:room', (req, res) => {
  if(req.params.room == 'request' || !req.params) {
    return res.sendFile(__dirname + '/public/room.html');
  } else {
    return res.sendFile(__dirname + '/public/main.html')
  }
})

// Chatroom

var numUsers = {};

io.on('connection', (socket) => {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (obj) => {
    var data = obj.message
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      room: obj.room,
      message: data
    });
    if(obj.room.startsWith('d/')) return
    if(!db.get('msgs')[obj.room]) {
     let a = db.get('msgs');
      a[obj.room] = []
      db.set('msgs', a);
    }
    let a = db.get('msgs');
    a[obj.room].push({
      username: socket.username,
      message: data
    })
    db.set('msgs', a)
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (obj) => {
    if(!numUsers[obj.room]) numUsers[obj.room] = 0;
    var username = obj.username
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    socket.room = obj.room;
    numUsers[obj.room] += 1;
    addedUser = true;
    if(!db.get('msgs') || !db.get('msgs')[obj.room]) {
     var a = db.get('msgs');
      if(!a) a = [];
      a[obj.room] = []
      db.set('msgs', a);
    }
    socket.emit('login', {
      numUsers: numUsers[obj.room],
      msgs: db.get('msgs')[obj.room]
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers[socket.room]
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username,
      room: socket.room
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username,
      room: socket.room
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      numUsers[socket.room]--;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers[socket.room]
      });
    }
  });
});