CREATE TABLE cards (
  id INTEGER PRIMARY KEY,
  name TEXT
);

CREATE TABLE drafts (
  id INTEGER PRIMARY KEY,
  current_seat_number INTEGER,
  started BOOLEAN
);

CREATE TABLE packs (
  id INTEGER PRIMARY KEY,
  selected_col INTEGER,
  selected_row INTEGER,
  draft_id INTEGER,
  FOREIGN KEY(draft_id) REFERENCES drafts(id)
);

CREATE TABLE decklists (
  id INTEGER PRIMARY KEY,
  draft_id INTEGER,
  seat_number INTEGER,
  FOREIGN KEY(draft_id) REFERENCES drafts(id)
);

CREATE TABLE shuffled_cube_cards (
  position INTEGER,
  draft_id INTEGER,
  card_id INTEGER,
  FOREIGN KEY(draft_id) REFERENCES drafts(id),
  FOREIGN KEY(card_id) REFERENCES cards(id),
  PRIMARY KEY(draft_id, position)
);

CREATE TABLE pack_cards (
  row INTEGER,
  col INTEGER,
  card_id INTEGER,
  pack_id INTEGER,
  selected BOOLEAN,
  FOREIGN KEY(card_id) REFERENCES cards(id),
  FOREIGN KEY(pack_id) REFERENCES packs(id),
  PRIMARY KEY(pack_id, row, col)
);

CREATE TABLE decklist_cards (
  card_id INTEGER,
  decklist_id INTEGER,
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
  FOREIGN KEY(draft_id) REFERENCES drafts(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  PRIMARY KEY(draft_id, seat_number)
);
