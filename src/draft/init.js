var _ = require("underscore");

var { transaction } = require('objection');
var passport = require('passport')

var Card = require('../models/card');
var Draft = require('../models/draft');
var User = require('../models/user');

var PackCard = require('../models/pack_card');


async function setUpDraft() {
  try {
    const draft = await createDraft();
    const user = await User
      .query()
      .where({username: 'user'})
      .first();
    await joinDraft(draft, user);
    const user2 = await User
      .query()
      .where({username: 'user2'})
      .first();
    await joinDraft(draft, user2);
    console.log("Finished draft setup");
  } catch (e) {
    console.log("Error while setting up the server", e);
  }
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
      const updated_draft = await startDraft(draft);
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
      .insert({started: false});
    return draft;
  } catch (e) {
    console.log("Caught error creating cube", e);
    throw e;
  }
}

async function startDraft(draft) {
  await createDecklist(draft, 0);
  await createDecklist(draft, 1);
  await createShuffledCube(draft);
  const updated_draft = await draft
    .$query()
    .patchAndFetch({started: true, current_seat_number: 0});
  return updated_draft
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

async function createPack(draft, trx) {
  const pack = await draft
    .$relatedQuery('packs', trx)
    .insert({});

  const shuffled_cards = await draft
    .$relatedQuery('shuffled_cards', trx)
    .orderBy('position')
    .limit(9);
  for (i = 0; i < shuffled_cards.length; i++) {
    const card = shuffled_cards[i];
    await draft
      .$relatedQuery('shuffled_cards', trx)
      .unrelate()
      .where('id', card.id)
    const new_card = await pack
      .$relatedQuery('cards', trx)
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

async function getCurrentPack(draft, trx) {
  try {
    return await draft
      .$relatedQuery('packs', trx)
      .orderBy('id', 'desc')
      .limit(1)
      .first();
  } catch (e) {
    console.log("No current pack");
  }
}

function isFirstPick(pack) {
  return pack.selected_row == null && pack.selected_col == null;
}

async function pickCards(row, col, user) {
  if (row) {
    row_number = row - 1;
  } else {
    col_number = col - 1;
  }
  const draft = await getCurrentDraft();
  const knex = Draft.knex();

  await transaction(knex, async (trx) => {
    const current_seat_number = draft.current_seat_number;
    const current_player = await draft
      .$relatedQuery('players', trx)
      .where({seat_number: current_seat_number})
      .first();

    if (current_player.id !== user.id) {
      throw Error("Trying to pick cards for another player");
    }

    // get decklist for user + draft
    const decklist = await draft
      .$relatedQuery('decklists', trx)
      .where({seat_number: current_seat_number})
      .first();

    // get pack
    const pack = await getCurrentPack(draft, trx);

    // get selected cards
    var cards;
    if (row) {
      if (pack.selected_row === row_number) {
        throw Error("Row was already selected");
      }
      cards = await pack
        .$relatedQuery('cards', trx)
        .where({row: row_number, selected: false});
    } else {
      if (pack.selected_col === col_number) {
        throw Error("Column was already selected");
      }
      cards = await pack
        .$relatedQuery('cards', trx)
        .where({col: col_number, selected: false});
    }

    // add cards into decklist
    for (var card of cards) {
      await PackCard
        .query(trx)
        .patch({selected: true})
        .where({card_id: card.id});

      await decklist
        .$relatedQuery('cards', trx)
        .relate({id: card.id});
    }

    // update turn in draft
    const is_first_pick = isFirstPick(pack);
    if (is_first_pick) {
      // If first pick on this pack, flip the current player
      const new_seat_number = 1 - current_seat_number
      await draft
        .$query(trx)
        .patch({current_seat_number: new_seat_number});
    } else {
      // Keep player number the same and create a new pack
      await createPack(draft, trx);
    }

    // update pack (mark as selected or make new pack)
    if (is_first_pick) {
      if (row) {
        await pack
          .$query(trx)
          .patch({selected_row: row_number});
      } else {
        await pack
          .$query(trx)
          .patch({selected_col: col_number});
      }
    }
  });
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
        url: card.image_url
      })
    ), 3);
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

async function getDecklistCardJson(draft, seat_number, user) {
  const decklist = await draft
    .$relatedQuery('decklists')
    .where({seat_number: seat_number})
    .first();
  if (! decklist) {
    throw Error("Can't find decklist");
  }
  const decklist_user = await decklist
    .$relatedQuery('user');
  if (decklist_user.id !== user.id) {
    throw Error("Trying to view decklist for another player");
  }
  const cards = await decklist
    .$relatedQuery('cards');
  return cards.map((card) => (
    {
      name: card.name,
      url: card.image_url
    })
  );
}

function initDraft(app) {
  app.get('/api/current_draft',
    (req, res) => {
      getCurrentDraft()
        .then(draft => draft.computedMapping())
        .then(mapping => res.send(mapping))
        .catch(e => {
          console.log("GET /api/current_draft error: ", e);
          res.status(500).send({"message": e.message});
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
          res.status(500).send({"message": e.message});
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
          res.status(500).send({"message": e.message});
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
          res.status(500).send({"message": e.message});
        });
  });
  
  app.get('/api/current_draft/seat_number/:seat_number/decklist',
    passport.requireLoggedIn(),
    (req, res) => {
      seat_number_int = parseInt(req.params.seat_number);
      getCurrentDraft()
        .then(draft => getDecklistCardJson(draft, seat_number_int, req.user))
        .then(json => res.send(json))
        .catch(e => {
          console.log("GET /api/current_draft/seat_number/:seat_number/decklist error: ", e);
          res.status(500).send({"message": e.message});
        });
  });
  
  app.post('/api/pick_cards',
    passport.requireLoggedIn(),
    (req, res) => {
      var row = req.body.row;
      var col = req.body.col;
  
      if (row || col) {
        pickCards(row, col, req.user)
          .then(result => res.send({}))
          .catch(e => {
            console.log("POST /api/pick_cards error: ", e);
            res.status(500).send({"message": e.message});
          });
      } else {
        console.log("POST /api/pick_cards error: 'row' or 'col is required:", req.body);
        res.send({});
      }
  });
}


module.exports.init = initDraft
module.exports.setUp = setUpDraft
