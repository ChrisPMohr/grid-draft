CREATE TABLE cards (
  id INTEGER PRIMARY KEY,
  name TEXT
);

CREATE TABLE draft_lobbies (
  id INTEGER PRIMARY KEY,
  started BOOLEAN,
  type TEXT
);

CREATE TABLE decklists (
  id INTEGER PRIMARY KEY,
  draft_id INTEGER,
  seat_number INTEGER,
  FOREIGN KEY(draft_id) REFERENCES draft_lobbies(id)
);

CREATE TABLE decklist_cards (
  card_id INTEGER,
  decklist_id INTEGER,
  pick_number INTEGER,
  FOREIGN KEY(card_id) REFERENCES cards(id),
  FOREIGN KEY(decklist_id) REFERENCES decklists(id),
  PRIMARY KEY(card_id, decklist_id)
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT,
  hashed_password TEXT,
  CONSTRAINT users_username_unique UNIQUE (username)
);

CREATE TABLE draft_player_seats (
  seat_number INTEGER,
  draft_id INTEGER,
  user_id INTEGER,
  FOREIGN KEY(draft_id) REFERENCES draft_lobbies(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  PRIMARY KEY(draft_id, seat_number)
);

CREATE TABLE shuffled_cube_cards (
  position INTEGER,
  draft_id INTEGER,
  card_id INTEGER,
  FOREIGN KEY(draft_id) REFERENCES draft_lobbies(id),
  FOREIGN KEY(card_id) REFERENCES cards(id),
  PRIMARY KEY(draft_id, position)
);

CREATE TABLE grid_drafts (
  id INTEGER PRIMARY KEY,
  current_seat_number INTEGER,
  draft_lobby_id INTEGER,
  FOREIGN KEY(draft_lobby_id) REFERENCES draft_lobbies(id)
);

CREATE TABLE grid_draft_packs (
  id INTEGER PRIMARY KEY,
  selected_col INTEGER,
  selected_row INTEGER,
  pack_number INTEGER,
  draft_id INTEGER,
  FOREIGN KEY(draft_id) REFERENCES grid_drafts(id)
);

CREATE TABLE grid_draft_pack_cards (
  row INTEGER,
  col INTEGER,
  card_id INTEGER,
  pack_id INTEGER,
  selected BOOLEAN,
  FOREIGN KEY(card_id) REFERENCES cards(id),
  FOREIGN KEY(pack_id) REFERENCES grid_draft_packs(id),
  PRIMARY KEY(pack_id, row, col)
);

CREATE TABLE glimpse_drafts (
  id INTEGER PRIMARY KEY,
  draft_lobby_id INTEGER,
  FOREIGN KEY(draft_lobby_id) REFERENCES draft_lobbies(id)
);

CREATE TABLE glimpse_draft_packs (
  id INTEGER PRIMARY KEY,
  pack_number INTEGER,
  original_seat_number INTEGER,
  current_seat_number INTEGER,
  draft_id INTEGER,
  FOREIGN KEY(draft_id) REFERENCES glimpse_drafts(id)
);

CREATE TABLE glimpse_draft_pack_cards (
  card_number INTEGER,
  card_id INTEGER,
  pack_id INTEGER,
  is_available BOOLEAN,
  FOREIGN KEY(card_id) REFERENCES cards(id),
  FOREIGN KEY(pack_id) REFERENCES glimpse_draft_packs(id),
  PRIMARY KEY(pack_id, card_number)
);
