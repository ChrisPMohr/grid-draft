var _ = require("underscore");
var fs  = require("fs");
var express = require('express');
var Knex = require('knex');
var knexConfig = require('./knexfile');
var { raw, Model } = require('objection');
var sqlite3 = require('sqlite3').verbose()

var Card = require('./models/card');
var Draft = require('./models/draft');
var Pack = require('./models/pack');
var Decklist = require('./models/decklist');
var ShuffledCubeCard = require('./models/shuffled_cube_card');
var PackCard = require('./models/pack_card');

const knex = Knex(knexConfig.development);

Model.knex(knex);

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static('public'))

function image_url(card_name) {
  return "/images/" + card_name
}

function get_pack_from_names(pack_names) {
  return {
    rows: pack_names.map((row) =>
      row.map((card_name) => (
        {
          name: card_name,
          url: image_url(card_name)
        })
      )
    )
  }
}

async function cleanupDb() {
  await Draft.query().delete();
  await Card.query().delete();
  await Pack.query().delete();
  await Decklist.query().delete();

  // Remove junction tables
  await ShuffledCubeCard.query().delete();
  await PackCard.query().delete();
}

async function createCards() {
  cubelist_path = "cubelist.txt"
  var cubelist = fs.readFileSync(cubelist_path).toString().trim().split('\n');

  for (var cardname of cubelist) {
    const draft = await Card
      .query()
      .insert({name: cardname});
  }

  return cubelist;
}

async function createDraft(cubelist) {
  try {
    const draft = await Draft
      .query()
      .insert({current_player_number: 0});
    createDecklist(draft, 0);
    createDecklist(draft, 1);
    await createShuffledCube(draft, cubelist);
  } catch (e) {
    console.log("Caught error creating cube", e);
    throw e;
  }
}

async function createDecklist(draft, player_number) {
  return draft
    .$relatedQuery('decklists')
    .insert({player_number: player_number});
}

async function createShuffledCube(draft, cubelist) {
  shuffled_cubelist = _.shuffle(cubelist);

  for (i = 0; i < shuffled_cubelist.length; i++) {
    const cardname = shuffled_cubelist[i];
    const card = await Card
      .query()
      .where('name', '=', cardname)
      .first();
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

async function getCurrentDraft() {
  try {
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

async function getPackCardNames(pack) {
  const cards = await pack
    .$relatedQuery('cards')
    .orderBy(['row', 'col'])
  return _.chunk(cards.map((card) => card.name), 3)
}

async function pickRow(row_number) {
  const draft = await getCurrentDraft();
  const pack = await getCurrentPack(draft);

  const row_cards = await pack
    .$relatedQuery('cards')
    .where('row', '=', row_number)
    .where('selected', '=', false);

  // If there are no cards, the row has already been selected
  if (row_cards.length == 0) {
    throw "Row was already selected";
  }

  // If there are cards pick them and add them to the player's decklist
  current_player_number = draft.current_player_number
  const decklist = await draft
    .$relatedQuery('decklists')
    .where({player_number: current_player_number})
    .first();

  for (var card of row_cards) {
    await PackCard
      .query()
      .patch({selected: true})
      .where({card_id: card.id});

    await decklist
      .$relatedQuery('cards')
      .relate({id: card.id});
  }

  // Flip the current player
  await Draft
    .query()
    .patch({current_player_number: 1 - current_player_number})
    .where({id: draft.id});
}

async function setUp() {
  try {
    await cleanupDb()
    const cubelist = await createCards();
    await createDraft(cubelist);
    console.log("Finished setup");
  } catch (e) {
    console.log("Error while setting up the server", e);
  }
}

setUp();

app.get('/api/hello', (req, res) => {
  res.send({ express: 'Hello From Express' });
});

app.get('/api/current_pack', (req, res) => {
  getCurrentDraft()
    .then(draft => getCurrentPack(draft))
    .then(pack => getPackCardNames(pack))
    .then(pack_names => res.send(get_pack_from_names(pack_names)))
    .catch(e => {
      console.log("GET /api/current_pack error: ", e);
      res.send({});
    });
});

app.post('/api/new_pack', (req, res) => {
  getCurrentDraft()
    .then(draft => createPack(draft))
    .then(result => res.send({}))
    .catch(e => {
      console.log("POST /api/new_pack error: ", e);
      res.send({});
    });
});

app.post('/api/pick_cards', (req, res) => {
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
    res.send({});
  } else {
    console.log("POST /api/pick_cards error: 'row' or 'col is required:", req.body);
    res.send({});
  }
});

app.listen(port, () => console.log(`Listening on port ${port}`));
