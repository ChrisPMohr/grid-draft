var _ = require("underscore");
var fs  = require("fs");

var Knex = require('knex');
var knexConfig = require('./knexfile');
var { raw, Model } = require('objection');
var sqlite3 = require('sqlite3').verbose()

var express = require('express');
var bodyParser = require('body-parser')
var passport = require('passport')
var session = require('express-session')
var RedisStore = require('connect-redis')(session)

var Card = require('./models/card');
var Draft = require('./models/draft');
var Pack = require('./models/pack');
var Decklist = require('./models/decklist');

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

function image_url(card_name) {
  return "/images/" + card_name
}

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

async function createAndJoinDraft(user) {
  const draft = await createDraft();
  const updated_draft = await joinDraft(draft, user);
  return updated_draft;
}

async function joinDraft(draft, user) {
  const playerCount = await draft.getPlayerCount();

  if (playerCount < 2) {
    // Right now this only runs with playerCount == 1, but keeping it general
    await draft
      .$relatedQuery('players')
      .relate({id: user.id, seat_number: playerCount});
    if (playerCount == 1) {
      console.log("Starting draft");
      const updated_draft = await draft
        .$query()
        .patchAndFetch({started: true, current_seat_number: 0});
      return updated_draft;
    } else {
      return draft;
    }
  } else {
    throw Error('Draft is full');
  }
}

async function createDraft() {
  try {
    const draft = await Draft
      .query()
      .insert({started: false, current_seat_number: 0});
    createDecklist(draft, 0);
    createDecklist(draft, 1);
    await createShuffledCube(draft);
    return draft;
  } catch (e) {
    console.log("Caught error creating cube", e);
    throw e;
  }
}

async function createDecklist(draft, seat_number) {
  return draft
    .$relatedQuery('decklists')
    .insert({seat_number: seat_number});
}

async function createShuffledCube(draft) {
  const cards = await Card
    .query();

  shuffled_cards = _.shuffle(cards);

  for (i = 0; i < shuffled_cards.length; i++) {
    const card = shuffled_cards[i];
    await draft
      .$relatedQuery('shuffled_cards')
      .relate({id: card.id, position: i});
  }

  try {
    await createPack(draft);
  } catch (e) {
    console.log("Caught error creating pack", e);
    throw e;
  }
}

async function createPack(draft) {
  const pack = await draft
    .$relatedQuery('packs')
    .insert({});

  const shuffled_cards = await draft
    .$relatedQuery('shuffled_cards')
    .orderBy('position')
    .limit(9);
  for (i = 0; i < shuffled_cards.length; i++) {
    const card = shuffled_cards[i];
    await draft
      .$relatedQuery('shuffled_cards')
      .unrelate()
      .where('id', card.id)
    const new_card = await pack
      .$relatedQuery('cards')
      .relate(
        {
          id: card.id,
          row: Math.floor(i / 3),
          col: i % 3,
          selected: false
        }
      );
  }
}

async function getCurrentDraft() { try {
    return await Draft
      .query()
      .orderBy('id', 'desc')
      .limit(1)
      .first();
  } catch (e) {
    console.log("No current draft", e);
  }
}

async function getCurrentPack(draft) {
  try {
    return await draft
      .$relatedQuery('packs')
      .orderBy('id', 'desc')
      .limit(1)
      .first();
  } catch (e) {
    console.log("No current pack");
  }
}

async function getPackCardsJson(pack) {
  const cards = await pack
    .$relatedQuery('cards')
    .orderBy(['row', 'col'])
  return _.chunk(
    cards.map((card) => (
      {
        name: card.name,
        selected: card.selected,
        url: image_url(card.name)
      })
    ), 3);
}

function isFirstPick(pack) {
  return pack.selected_row == null && pack.selected_col == null;
}

async function pickRow(row_number) {
  const draft = await getCurrentDraft();
  const pack = await getCurrentPack(draft);

  const is_first_pick = isFirstPick(pack);

  if (pack.selected_row === row_number) {
    throw "Row was already selected";
  }

  const row_cards = await pack
    .$relatedQuery('cards')
    .where('row', '=', row_number)
    .where('selected', '=', false);

  await pickCards(draft, row_cards, is_first_pick);

  if (is_first_pick) {
    await Pack
      .query()
      .patch({selected_row: row_number})
      .where({id: pack.id});
  }
}

async function pickCol(col_number) {
  const draft = await getCurrentDraft();
  const pack = await getCurrentPack(draft);

  const is_first_pick = isFirstPick(pack);

  if (pack.selected_col === col_number) {
    throw "Column was already selected";
  }

  const col_cards = await pack
    .$relatedQuery('cards')
    .where('col', '=', col_number)
    .where('selected', '=', false);

  await pickCards(draft, col_cards, is_first_pick);

  if (is_first_pick) {
    await Pack
      .query()
      .patch({selected_col: col_number})
      .where({id: pack.id});
  }
}

async function pickCards(draft, pack_cards, is_first_pick) {
  // If there are cards pick them and add them to the player's decklist
  current_seat_number = draft.current_seat_number
  const decklist = await draft
    .$relatedQuery('decklists')
    .where({seat_number: current_seat_number})
    .first();

  for (var card of pack_cards) {
    await PackCard
      .query()
      .patch({selected: true})
      .where({card_id: card.id});

    await decklist
      .$relatedQuery('cards')
      .relate({id: card.id});
  }

  if (is_first_pick) {
    // If first pick on this pack, flip the current player
    new_seat_number = 1 - current_seat_number
    await Draft
      .query()
      .patch({current_seat_number: new_seat_number})
      .where({id: draft.id});
  } else {
    // Keep player number the same and create a new pack
    await createPack(draft);
  }
}

async function getCurrentState(draft) {
  const pack = await getCurrentPack(draft);
  const pack_cards_json = await getPackCardsJson(pack);

  return {
    cards: pack_cards_json,
    selected_row: pack.selected_row,
    selected_col: pack.selected_col,
    current_seat_number: draft.current_seat_number
  };
}

async function getDecklistCardJson(draft, seat_number) {
  const decklist = await draft
    .$relatedQuery('decklists')
    .where({seat_number: seat_number})
    .first();
  const cards = await decklist
    .$relatedQuery('cards');
  return cards.map((card) => (
    {
      name: card.name,
      url: image_url(card.name)
    })
  );
}

async function setUp() {
  try {
    await cleanupDb();
    await createDraft();
    console.log("Finished setup");
  } catch (e) {
    console.log("Error while setting up the server", e);
  }
}

setUp();

app.get('/api/current_draft',
  (req, res) => {
    getCurrentDraft()
      .then(draft => draft.computedMapping())
      .then(mapping => res.send(mapping))
      .catch(e => {
        console.log("GET /api/current_draft error: ", e);
        res.send({});
      });
});

app.post('/api/draft',
  passport.requireLoggedIn(),
  (req, res) => {
    createAndJoinDraft(req.user)
      .then(draft => draft.computedMapping())
      .then(mapping => res.send(mapping))
      .catch(e => {
        console.log("POST /api/draft error: ", e);
        res.send({});
      });
});

app.post('/api/join_current_draft',
  passport.requireLoggedIn(),
  (req, res) => {
    getCurrentDraft()
      .then(draft => joinDraft(draft, req.user))
      .then(draft => res.send(draft.mapping()))
      .catch(e => {
        console.log("POST /api/join_current_draft error: ", e);
        res.send({});
      });
});

app.get('/api/current_pack',
  passport.requireLoggedIn(),
  (req, res) => {
    getCurrentDraft()
      .then(draft => getCurrentState(draft))
      .then(json => res.send(json))
      .catch(e => {
        console.log("GET /api/current_pack error: ", e);
        res.send({});
      });
});

app.get('/api/decklist/:seat_number',
  passport.requireLoggedIn(),
  (req, res) => {
    seat_number_int = parseInt(req.params.seat_number);
    getCurrentDraft()
      .then(draft => getDecklistCardJson(draft, seat_number_int))
      .then(json => res.send(json))
      .catch(e => {
        console.log("GET /api/decklist/<player_num> error: ", e);
        res.send({});
      });
});

app.post('/api/pick_cards',
  passport.requireLoggedIn(),
  (req, res) => {
    console.log("Picking cards for user", req.user.username);
    var row = req.body.row;
    var col = req.body.col;

    if (row) {
      pickRow(row - 1)
        .then(result => res.send({}))
        .catch(e => {
          console.log("POST /api/pick_cards error: ", e);
          res.send({});
        });
    } else if (col) {
      pickCol(col - 1)
        .then(result => res.send({}))
        .catch(e => {
          console.log("POST /api/pick_cards error: ", e);
          res.send({});
        });
    } else {
      console.log("POST /api/pick_cards error: 'row' or 'col is required:", req.body);
      res.send({});
    }
});

require('./user').init(app)

app.listen(port, () => console.log(`Listening on port ${port}`));
