var _ = require("underscore");

var { transaction } = require('objection');
var passport = require('passport')

var Card = require('../models/card');
var DraftLobby = require('../models/draft_lobby');
var GridDraft = require('../models/grid_draft');
var User = require('../models/user');



async function setUpDraft() {
  try {
    const draft_lobby = await createDraftLobby();
    const grid_draft = await GridDraft.createDraft(draft_lobby);
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
  const grid_draft = await GridDraft.createDraft(draft_lobby);
  return await joinDraftLobby(draft_lobby, user);
}

async function joinDraftLobby(draft_lobby, user) {
  const playerCount = await draft_lobby.getPlayerCount();
  const seatNumber = playerCount;


  if (playerCount < 2) {
    await draft_lobby
      .$relatedQuery('players')
      .relate({id: user.id, seat_number: seatNumber});
    if (playerCount == 1) {
      console.log("Starting draft");
      const updated_draft_lobby = await startDraftLobby(draft_lobby);
      const grid_draft = await getDraftForLobby(draft_lobby)
      const updated_grid_draft = await grid_draft.startDraft();

      return [updated_draft_lobby, seatNumber];
    } else {
      return [draft_lobby, seatNumber];
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

function getOtherSeatNumber(seat_number) {
  return 1 - seat_number
}

async function getDecklistCardJson(draft_lobby, seat_number, user) {
  const decklist = await draft_lobby
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
  const pack = await grid_draft.getCurrentPack(user);
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
        .then(lobby => lobby.computedMapping())
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
        .then(lobby_and_seat_number => {
          res.send({
            'draft': lobby_and_seat_number[0].computedMapping(),
            'seat': lobby_and_seat_number[1]
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
        .then(lobby_and_seat_number => {
          res.send({
            'draft': lobby_and_seat_number[0].computedMapping(),
            'seat': lobby_and_seat_number[1]
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
        .then(draft => draft.getCurrentState(req.user))
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
        .then(lobby => getDecklistCardJson(lobby, seat_int, req.user))
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
      var body = req.body;

      if (body) {
        getCurrentDraftLobby()
          .then(lobby => getDraftForLobby(lobby))
          .then(draft => draft.pickCards(body, req.user, refreshClient))
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
