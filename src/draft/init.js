var _ = require("underscore");

var { transaction } = require('objection');
var passport = require('passport')

var Card = require('../models/card');
var DraftLobby = require('../models/draft_lobby');
var GridDraft = require('../models/grid_draft');
var User = require('../models/user');

var PackCard = require('../models/pack_card');


async function setUpDraft() {
  try {
    const draft_lobby = await createDraftLobby();
    const grid_draft = await createGridDraft(draft_lobby);
    //const user = await User
    //  .query()
    //  .where({username: 'user'})
    //  .first();
    //await joinDraft(draft, user);
    //const user2 = await User
    //  .query()
    //  .where({username: 'user2'})
    //  .first();
    //await joinDraft(draft, user2);
    console.log("Finished draft setup");
  } catch (e) {
    console.log("Error while setting up the server", e);
  }
}

async function createAndJoinDraftLobby(user) {
  const draft_lobby = await createDraftLobby();
  const grid_draft = await createGridDraft(draft_lobby);
  const updated_draft_and_seat_number = await joinDraftLobby(draft_lobby, user);
  return updated_draft_and_seat_number;
}

async function joinDraftLobby(draft_lobby, user) {
  const playerCount = await draft_lobby.getPlayerCount();
  const seatNumber = playerCount;

  const grid_draft = await getDraftForLobby(draft_lobby)

  if (playerCount < 2) {
    await draft_lobby
      .$relatedQuery('players')
      .relate({id: user.id, seat_number: seatNumber});
    if (playerCount == 1) {
      console.log("Starting draft");
      const updated_draft_lobby = await startDraftLobby(draft_lobby);
      const updated_grid_draft = await grid_draft
        .$query()
        .patchAndFetch({current_seat_number: 0});

      try {
        await createPack(grid_draft);
      } catch (e) {
        console.log("Caught error creating pack", e);
        throw e;
      }

      return [updated_grid_draft, seatNumber];
    } else {
      return [grid_draft, seatNumber];
    }
  } else {
    throw Error('Draft is full');
  }
}

async function createDraftLobby() {
  try {
    const draft_lobby = await DraftLobby
      .query()
      .insert({started: false});
    return draft_lobby;
  } catch (e) {
    console.log("Caught error creating lobby", e);
    throw e;
  }
}

async function createGridDraft(draft_lobby) {
  try {
    const grid_draft = await GridDraft
      .query()
      .insert({draft_lobby_id: draft_lobby.id});
    return grid_draft;
  } catch (e) {
    console.log("Caught error creating grid_draft", e);
    throw e;
  }
}

async function startDraftLobby(draft_lobby) {
  await createDecklist(draft_lobby, 0);
  await createDecklist(draft_lobby, 1);
  await createShuffledCube(draft_lobby);
  const updated_draft_lobby = await draft_lobby
    .$query()
    .patchAndFetch({started: true});
  return updated_draft_lobby
}

async function createDecklist(draft_lobby, seat_number) {
  return draft_lobby
    .$relatedQuery('decklists')
    .insert({seat_number: seat_number});
}

async function createShuffledCube(draft_lobby) {
  const cards = await Card
    .query();

  shuffled_cards = _.shuffle(cards);

  for (i = 0; i < shuffled_cards.length; i++) {
    const card = shuffled_cards[i];
    await draft_lobby
      .$relatedQuery('shuffled_cards')
      .relate({id: card.id, position: i});
  }
}

async function createPack(grid_draft, trx) {
  const pack_count_response = await grid_draft.$relatedQuery('packs', trx).count();
  const pack_number = pack_count_response[0]['count(*)'] + 1;

  const pack = await grid_draft
    .$relatedQuery('packs', trx)
    .insert({pack_number: pack_number});

  const draft_lobby = await grid_draft
    .$relatedQuery('draft_lobby', trx);
  const shuffled_cards = await draft_lobby
    .$relatedQuery('shuffled_cards', trx)
    .orderBy('position')
    .limit(9);
  for (i = 0; i < shuffled_cards.length; i++) {
    const card = shuffled_cards[i];
    await draft_lobby
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

async function getCurrentDraftLobby() {
  try {
    return await DraftLobby
      .query()
      .orderBy('id', 'desc')
      .limit(1)
      .first();
  } catch (e) {
    console.log("No current lobby", e);
  }
}

async function getDraftForLobby(draft_lobby) {
  try {
    return await GridDraft
      .query()
      .where('draft_lobby_id', '=', draft_lobby.id)
      .limit(1)
      .first()
  } catch (e) {
    console.log("No matching draft", e);
  }
}


async function getCurrentPack(grid_draft, trx) {
  try {
    return await grid_draft
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

function getOtherSeatNumber(seat_number) {
  return 1 - seat_number
}

async function pickCards(row, col, user, refreshClient) {
  if (row) {
    row_number = row - 1;
  } else {
    col_number = col - 1;
  }
  const draft_lobby = await getCurrentDraftLobby();
  const grid_draft = await getDraftForLobby(draft_lobby);

  const knex = GridDraft.knex();

  await transaction(knex, async (trx) => {
    const current_seat_number = grid_draft.current_seat_number;
    const current_player = await draft_lobby
      .$relatedQuery('players', trx)
      .where({seat_number: current_seat_number})
      .first();

    if (current_player.id !== user.id) {
      throw Error("Trying to pick cards for another player");
    }

    // get decklist for user + draft
    const decklist = await draft_lobby
      .$relatedQuery('decklists', trx)
      .where({seat_number: current_seat_number})
      .first();

    // get pack
    const pack = await getCurrentPack(grid_draft, trx);

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
        .relate({
            id: card.id,
            pick_number: pack.pack_number});
    }

    // update turn in draft
    const is_first_pick = isFirstPick(pack);
    const other_seat_number = getOtherSeatNumber(current_seat_number)
    if (is_first_pick) {
      // If first pick on this pack, flip the current player
      await grid_draft
        .$query(trx)
        .patch({current_seat_number: other_seat_number});
      refreshClient(other_seat_number);
    } else {
      // Keep player number the same and create a new pack
      await createPack(grid_draft, trx);
      refreshClient(other_seat_number);
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

async function getDraftCurrentState(grid_draft) {
  const pack = await getCurrentPack(grid_draft);
  const pack_cards_json = await getPackCardsJson(pack);

  return {
    cards: pack_cards_json,
    selected_row: pack.selected_row,
    selected_col: pack.selected_col,
    current_seat_number: grid_draft.current_seat_number,
    pack_number: pack.pack_number
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

async function getOpponentLastPickCardJson(draft_lobby, seat_number, user) {
  const opponent_seat_number = getOtherSeatNumber(seat_number)
  const decklist = await draft_lobby
    .$relatedQuery('decklists')
    .where({seat_number: opponent_seat_number})
    .first();
  if (! decklist) {
    throw Error("Can't find decklist");
  }

  const grid_draft = await getDraftForLobby(draft_lobby);
  const pack = await getCurrentPack(grid_draft);
  if (! pack) {
    throw Error("Can't find pack");
  }
  const previous_pack_number = pack.pack_number - 1;

  const cards = await decklist
    .$relatedQuery('cards')
    .where('pick_number', previous_pack_number);

  return cards.map((card) => (
    {
      name: card.name,
      url: card.image_url
    })
  );
}

function initDraft(app, refreshClient) {
  app.get('/api/current_draft',
    (req, res) => {
      getCurrentDraftLobby()
        .then(lobby => getDraftForLobby(lobby))
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
      createAndJoinDraftLobby(req.user)
        .then(draft_and_seat_number => {
          return [
            draft_and_seat_number[1].computedMapping(),
            draft_and_seat_number[2]];
        })
        .then(draft_mapping_and_seat_number => {
          res.send({
            'draft': draft_mapping_and_seat_number[0],
            'seat': draft_mapping_and_seat_number[1]
          });
        })
        .catch(e => {
          console.log("POST /api/draft error: ", e);
          res.status(500).send({"message": e.message});
        });
  });

  app.post('/api/join_current_draft',
    passport.requireLoggedIn(),
    (req, res) => {
      getCurrentDraftLobby()
        .then(lobby => joinDraftLobby(lobby, req.user))
        .then(draft_and_seat_number => {
          return [
            draft_and_seat_number[0].computedMapping(),
            draft_and_seat_number[1]];
        })
        .then(draft_mapping_and_seat_number => {
          res.send({
            'draft': draft_mapping_and_seat_number[0],
            'seat': draft_mapping_and_seat_number[1]
          });
        })
        .catch(e => {
          console.log("POST /api/join_current_draft error: ", e);
          res.status(500).send({"message": e.message});
        });
  });

  app.get('/api/current_pack',
    passport.requireLoggedIn(),
    (req, res) => {
      getCurrentDraftLobby()
        .then(lobby => getDraftForLobby(lobby))
        .then(draft => getDraftCurrentState(draft))
        .then(json => res.send(json))
        .catch(e => {
          console.log("GET /api/current_pack error: ", e);
          res.status(500).send({"message": e.message});
        });
  });

  app.get('/api/current_draft/seat/:seat/decklist',
    passport.requireLoggedIn(),
    (req, res) => {
      seat_int = parseInt(req.params.seat);
      getCurrentDraftLobby()
        .then(draft => getDecklistCardJson(draft, seat_int, req.user))
        .then(json => res.send(json))
        .catch(e => {
          console.log("GET /api/current_draft/seat/:seat/decklist error: ", e);
          res.status(500).send({"message": e.message});
        });
  });

  app.get('/api/current_draft/seat/:seat/opponent_last_picks',
    passport.requireLoggedIn(),
    (req, res) => {
      seat_int = parseInt(req.params.seat);
      getCurrentDraftLobby()
        .then(lobby => getOpponentLastPickCardJson(lobby, seat_int, req.user))
        .then(json => res.send(json))
        .catch(e => {
          console.log("GET /api/current_draft/seat/:seat/opponent_last_picks error: ", e);
          res.status(500).send({"message": e.message});
        });
  });

  app.post('/api/pick_cards',
    passport.requireLoggedIn(),
    (req, res) => {
      var row = req.body.row;
      var col = req.body.col;

      if (row || col) {
        pickCards(row, col, req.user, refreshClient)
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
