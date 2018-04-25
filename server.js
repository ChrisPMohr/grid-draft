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
var PackCard = require('./models/pack_card');
var ShuffledCube = require('./models/shuffled_cube');

const knex = Knex(knexConfig.development);

Model.knex(knex);

const app = express();
const port = process.env.PORT || 5000;

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
  await ShuffledCube.query().delete();
  await Pack.query().delete();
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
  const draft = await Draft
    .query()
    .insert({});
  const draft_id = draft.id;

  try {
    await createShuffledCube(draft_id, cubelist);
  } catch (e) {
    console.log("Caught error shuffling cube");
    throw e;
  }
}

async function createShuffledCube(draft_id, cubelist) {
  shuffled_cubelist = _.shuffle(cubelist);

  for (i = 0; i < shuffled_cubelist.length; i++) {
    const cardname = shuffled_cubelist[i];
    const cards = await Card
      .query()
      .where('name', '=', cardname);
    const card = cards[0];
    await ShuffledCube
     .query()
     .insert({draft_id: draft_id, card_id: card.id, position: i});
  }

  try {
    await createPack(draft_id);
  } catch (e) {
    console.log("Caught error creating pack");
    throw e;
  }
}

async function createPack(draft_id) {
  const pack = await Pack
    .query()
    .insert({draft_id: draft_id});
  const pack_id = pack.id;

  const shuffled_cube_entries = await ShuffledCube
    .query()
    .where('draft_id', '=', draft_id)
    .orderBy('position')
    .limit(9);
  const card_ids = shuffled_cube_entries.map((entry) => entry.card_id);
  for (i = 0; i < shuffled_cube_entries.length; i++) {
    const entry = shuffled_cube_entries[i];
    const entry_id = entry.$id();
    await ShuffledCube
      .query()
      .deleteById(entry_id);
    await PackCard
      .query()
      .insert(
        {
          card_id: entry.card_id,
          pack_id: pack.id,
          row: Math.floor(i / 3),
          col: i % 3
       }
     )
  }
}

async function getCurrentDraftId() {
  const result = await Draft
    .query()
    .select(raw('MAX(id) as id'))
  const max_id = result[0].id
  return max_id;
}

async function getCurrentPackId(draft_id) {
  const result = await Pack
    .query()
    .select(raw('MAX(id) as id'))
    .where('draft_id', '=', draft_id)
  const max_id = result[0].id
  return max_id;
}

async function getPackNames(pack_id) {
  const pack_cards = await PackCard
    .query()
    .select('pack_cards.*', 'cards.name as name')
    .join('cards', 'pack_cards.card_id', 'cards.id')
    .where('pack_id', '=', pack_id)
    .orderBy(['row', 'col'])
  return _.chunk(pack_cards.map((card) => card.name), 3)
}

async function setUp() {
  try {
    await cleanupDb()
    const cubelist = await createCards();
    createDraft(cubelist);
    console.log("Finished setup");
  } catch (e) {
    console.log("Error while setting up the server");
  }
}

setUp();

app.get('/api/hello', (req, res) => {
  res.send({ express: 'Hello From Express' });
});

app.get('/api/current_pack', (req, res) => {
  getCurrentDraftId()
   .then(draft_id => getCurrentPackId(draft_id))
   .then(pack_id => getPackNames(pack_id))
   .then(pack_names => res.send(get_pack_from_names(pack_names)));
});

app.post('/api/new_pack', (req, res) => {
  getCurrentDraftId()
    .then(draft_id => createPack(draft_id))
    .then(result => res.send({}));
});

app.listen(port, () => console.log(`Listening on port ${port}`));
