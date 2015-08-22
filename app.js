var express = require('express');
var app = express();

var sassMiddleware = require('node-sass-middleware');
var path = require('path');
app.use(sassMiddleware({
    src: path.join(__dirname, 'sass'),
    dest: path.join(__dirname, 'public'),
    debug: true,
    outputStyle: 'compressed',
    prefix:  '/prefix'
}));

app.use(express.static('public'));

var uuid = require('uuid');

var server = require('http').Server(app);
server.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
var io = require('socket.io')(server);

// GAME VARS

var monsters = {};
var monsterSpeed = 4;

// END GAME VARS

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  var id = uuid.v4();
  var monster = {
    id: id,
    x: 10,
    y: 20,
    type: 'gargant',
    direction: 'up'
  }
  monsters[id] = monster;
  socket['monster_id'] = id;
  socket.emit('start', {monster: monster, info: {speed: monsterSpeed}});

  socket.on('move', function (data) {
    if(data.id == undefined || data.x == undefined || data.y == undefined) {
      return;
    }
    var monster = monsters[data.id];
    if(monster.x + monsterSpeed == data.x || monster.x - monsterSpeed == data.x || monster.x == data.x) {
      if(monster.y + monsterSpeed == data.y || monster.y - monsterSpeed == data.y || monster.y == data.y) {
        monster.x = data.x;
        monster.y = data.y;
        socket.broadcast.emit('update-pos', monster);
      }
    }
  });

  socket.on('disconnect', function() {
    socket.broadcast.emit('player-disconnect', socket.monster_id);
    delete monsters[socket.monster_id];
  });

});
