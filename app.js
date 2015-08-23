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
var monsterSpeed = 8;
var monsterTypes = ['toad', 'ghost'];

var mapWidth = 3072;
var mapHeight = 2048;
var wallWidth = 96;
var wallHeight = 60;

var Human = function(type, x, y, direction, id, speed, target) {
  this.type = type;
  this.x = x;
  this.y = y;
  this.direction = direction;
  this.id = id;
  this.target = target;
  this.speed = speed;
};
var humans = {};
var humanSpeed = 2;
var humanIntervals = {};
var humanTypes = ['person_a', 'person_b', 'person_c'];

// END GAME VARS

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  var id = uuid.v4();
  var monster = {
    id: id,
    x: 550,
    y: 450,
    // x: getRandomInt(wallWidth + 100, (mapWidth - wallWidth) - 100),
    // y: getRandomInt(wallHeight + 100, (mapHeight - wallHeight) - 100),
    type: monsterTypes[Math.floor(Math.random() * monsterTypes.length)],
    direction: 'up'
  }
  monsters[id] = monster;
  socket['monster_id'] = id;

  socket.emit('start', {monster: monster, info: {speed: monsterSpeed}});
  socket.broadcast.emit('player-connect', monster);

  socket.on('move', function (data) {
    if(data.id == undefined || data.x == undefined || data.y == undefined) {
      return;
    }
    var monster = monsters[data.id];
    if(monster.x + monsterSpeed == data.x || monster.x - monsterSpeed == data.x || monster.x == data.x) {
      if(monster.y + monsterSpeed == data.y || monster.y - monsterSpeed == data.y || monster.y == data.y) {
        if(data.x > wallWidth && data.x < mapWidth - wallWidth) {
          if(data.y > wallHeight && data.y < mapHeight - wallHeight) {
            monster.x = data.x;
            monster.y = data.y;
            monster.direction = data.direction;
            socket.broadcast.emit('update-pos', monster);
          }
        }
      }
    }
  });

  socket.on('attack', function(data) {
    //TODO check if we are hitting player
    socket.broadcast.emit('attacking', monsters[data.id]);
  })

  socket.on('disconnect', function() {
    socket.broadcast.emit('player-disconnect', socket.monster_id);
    delete monsters[socket.monster_id];
  });

});

function updatePerson(id) {
  var human = humans[id];
  //TODO if we have time, make this smarter?
  var newTargetX = getRandomInt(wallWidth + 100, (mapWidth - wallWidth) - 100);
  var newTargetY = getRandomInt(wallHeight + 100, (mapHeight - wallHeight) - 100);
  human.target = {x: newTargetX, y: newTargetY};
  io.sockets.emit('human-target', human);
}

function buildHuman() {
  var id = uuid.v4();
  var x = getRandomInt(wallWidth + 100, (mapWidth - wallWidth) - 100);
  var y = getRandomInt(wallHeight + 100, (mapHeight - wallHeight) - 100);
  var type = humanTypes[Math.floor(Math.random() * humanTypes.length)]
  var newHuman = new Human(type, x, y, 'up', id, humanSpeed, {x: 0, y: 0});
  humans[id] = newHuman;
  updatePerson(id);
  var loopId = setInterval(function() {
    updatePerson(id);
  }, 3 * 1000);
  humanIntervals[id] = loopId;
}

for(var i = 0; i < 3; i++){
  buildHuman(3);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
