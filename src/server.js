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

var User = require('./models/user');
var Card = require('./models/card');
var DraftLobby = require('./models/draft_lobby');
var Decklist = require('./models/decklist');
var DecklistCard = require('./models/decklist_card');
var DraftPlayerSeat = require('./models/draft_player_seat');
var ShuffledCubeCard = require('./models/shuffled_cube_card');
var GridDraft = require('./models/grid_draft');
var GridDraftPack = require('./models/grid_draft_pack');
var GridDraftPackCard = require('./models/grid_draft_pack_card');
var GlimpseDraft = require('./models/glimpse_draft');
var GlimpseDraftPack = require('./models/glimpse_draft_pack');
var GlimpseDraftPackCard = require('./models/glimpse_draft_pack_card');

const knex = Knex(knexConfig.development);

Model.knex(knex);

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

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
  await DraftLobby.query().delete();
  await GridDraft.query().delete();
  await GridDraftPack.query().delete();
  await GlimpseDraft.query().delete();
  await GlimpseDraftPack.query().delete();
  await Decklist.query().delete();

  // Remove junction tables
  await ShuffledCubeCard.query().delete();
  await GridDraftPackCard.query().delete();
  await GlimpseDraftPackCard.query().delete();
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
    await cleanupCube();
    await createCube();
    await require('./draft').setUp()
  } catch (e) {
    console.log("Error while setting up the server", e);
  }
}

setUp();

require('./user').init(app)
require('./draft').init(app, refreshClient)

app.listen(port, () => console.log(`Listening on port ${port}`));
