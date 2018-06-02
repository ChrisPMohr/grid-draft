var fs  = require("fs");

var Knex = require('knex');
var knexConfig = require('./knexfile');
var { Model } = require('objection');
var sqlite3 = require('sqlite3').verbose()

var express = require('express');
var bodyParser = require('body-parser')
var passport = require('passport')
var session = require('express-session')
var RedisStore = require('connect-redis')(session)
var WebSocket = require('ws');

var Card = require('./models/card');
var Draft = require('./models/draft');
var Pack = require('./models/pack');
var Decklist = require('./models/decklist');
var User = require('./models/user');

var ShuffledCubeCard = require('./models/shuffled_cube_card');
var PackCard = require('./models/pack_card');
var DecklistCard = require('./models/decklist_card');
var DraftPlayerSeat = require('./models/draft_player_seat');

const knex = Knex(knexConfig.development);

Model.knex(knex);

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static('public'))

app.use(bodyParser.json())

// TODO: Move this somewhere more appropriate
const config = {}

config.redisStore = {
  url: process.env.REDIS_STORE_URI,
  secret: process.env.REDIS_STORE_SECRET
}

require('./authentication').init(app)

app.use(session({
  store: new RedisStore({
    url: config.redisStore.url
  }),
  secret: config.redisStore.secret,
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

const wss = new WebSocket.Server({ port: 8080 });
var connections = {};

// Broadcast to all.
function refreshClient(seat_number) {
  var client = connections[seat_number]
  if (client && client.readyState === WebSocket.OPEN) {
    client.send("Refresh");
  }
};

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    // Broadcast to everyone else.
    connections[data] = ws;
  });
});

async function cleanupDb() {
  await Draft.query().delete();
  await Pack.query().delete();
  await Decklist.query().delete();

  // Remove junction tables
  await ShuffledCubeCard.query().delete();
  await PackCard.query().delete();
  await DecklistCard.query().delete();
  await DraftPlayerSeat.query().delete();
}


// not currently used
async function cleanupCube() {
  await Card.query().delete();
}

// not currently used
async function createCube() {
  cubelist_path = "cubelist.txt"
  var cubelist = fs.readFileSync(cubelist_path).toString().trim().split('\n');

  for (var cardname of cubelist) {
    const draft = await Card
      .query()
      .insert({name: cardname});
  }

  return cubelist;
}

async function setUp() {
  try {
    await cleanupDb();
    await require('./draft').setUp()
  } catch (e) {
    console.log("Error while setting up the server", e);
  }
}

setUp();

require('./user').init(app)
require('./draft').init(app, refreshClient)

app.listen(port, () => console.log(`Listening on port ${port}`));
