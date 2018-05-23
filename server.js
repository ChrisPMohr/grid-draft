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
var DecklistCard = require('./models/decklist_card');

const knex = Knex(knexConfig.development);

Model.knex(knex);

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static('public'))

function image_url(card_name) {
  return "/images/" + card_name
}

async function cleanupDb() {
  await Draft.query().delete();
  await Card.query().delete();
  await Pack.query().delete();
  await Decklist.query().delete();

  // Remove junction tables
  await ShuffledCubeCard.query().delete();
  await PackCard.query().delete();
  await DecklistCard.query().delete();
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
  current_player_number = draft.current_player_number
  const decklist = await draft
    .$relatedQuery('decklists')
    .where({player_number: current_player_number})
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
    new_player_number = 1 - current_player_number
    await Draft
      .query()
      .patch({current_player_number: new_player_number})
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
    current_player_number: draft.current_player_number
  };
}

async function getDecklistCardJson(draft, player_number) {
  const decklist = await draft
    .$relatedQuery('decklists')
    .where({player_number: player_number})
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
    .then(draft => getCurrentState(draft))
    .then(json => res.send(json))
    .catch(e => {
      console.log("GET /api/current_pack error: ", e);
      res.send({});
    });
});

app.get('/api/decklist/:player_number', (req, res) => {
  player_number_int = parseInt(req.params.player_number);
  getCurrentDraft()
    .then(draft => getDecklistCardJson(draft, player_number_int))
    .then(json => res.send(json))
    .catch(e => {
      console.log("GET /api/decklist/<player_num> error: ", e);
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

app.listen(port, () => console.log(`Listening on port ${port}`));
