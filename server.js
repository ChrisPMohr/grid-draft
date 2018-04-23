var express = require('express');
var fs  = require("fs");
var _ = require("underscore");
var sqlite3 = require('sqlite3').verbose()

var db = new sqlite3.Database('dev.db')

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

var current_pack_names = {
  rows: [
    [
      "Snapcaster Mage",
      "Fyndhorn Elves",
      "Shriekmaw"
    ],
    [
      "Strip Mine",
      "Baleful Strix",
      "Snuff Out"
    ],
    [
      "Maelstrom Pulse",
      "Wrath of God",
      "Goblin Rabblemaster"
    ]
  ]
}

function cleanupDb() {
  db.run('DELETE FROM card');
  db.run('DELETE FROM shuffled_cube');
  db.run('DELETE FROM pack');
  db.run('DELETE FROM pack_card');
}

function createCards() {
  cubelist_path = "cubelist.txt"
  var cubelist = fs.readFileSync(cubelist_path).toString().trim().split('\n');

  var insert_card_stmt = db.prepare('INSERT INTO card(name) VALUES (?)');

  for (var cardname of cubelist) {
    insert_card_stmt.run(cardname);
  }

  insert_card_stmt.finalize();

  return cubelist;
}

function createDraft(cubelist) {
  var draft_id;
  db.run('INSERT INTO draft DEFAULT VALUES', [], function (err) {
    draft_id = this.lastID;
    console.log("Created draft " + draft_id);
    createShuffledCube(draft_id, cubelist);
  });
}

function createShuffledCube(draft_id, cubelist) {
  shuffled_cubelist = _.shuffle(cubelist);
  var insert_shuffled_cubelist_stmt = db.prepare(
    'INSERT INTO shuffled_cube(position, draft_id, card_id) VALUES (?, ?, ?)');
  var get_card_id_stmt = db.prepare('SELECT id FROM card WHERE name = (?)');

  let inserts = shuffled_cubelist.map((cardname, index) => {
      return new Promise((resolve) => {
        get_card_id_stmt.get(cardname, function(err, row) {
          insert_shuffled_cubelist_stmt.run([index, draft_id, row.id], (err) => resolve())
        });
       })
   });

  Promise.all(inserts)
    .then(() => {
      get_card_id_stmt.finalize();
      insert_shuffled_cubelist_stmt.finalize();
      createPack(draft_id);
  });
}

function createPack(draft_id) {
  var pack_id;
  db.run('INSERT INTO pack(draft_id) VALUES (?)', [draft_id], function (err) {
    pack_id = this.lastID;
    var cards = []
    db.each(
      'SELECT card_id, position FROM shuffled_cube WHERE draft_id = (?) ORDER BY position ASC LIMIT 9',
      [draft_id],
      (err, row) => {
        cards.push(row),
        db.run(
          'DELETE FROM shuffled_cube WHERE draft_id = ? AND position = ?',
          [draft_id, row.position],
          (err) => {
            if (err)
              console.log(err);
          }
        );
      },
      () => {
        cards.forEach((card, index) => {
          db.run(
            'INSERT INTO pack_card(card_id, pack_id, row, col) VALUES (?, ?, ?, ?)',
            [card.card_id, pack_id, Math.floor(index / 3), index % 3])
        });
      }
    );
  });
}

function getCurrentDraft() {
  return new Promise(resolve => {
    db.get('SELECT MAX(id) AS id FROM draft', (err, row) => resolve(row.id))
  });
}

function getCurrentPack(draft_id) {
  return new Promise(resolve => {
    db.get(
      'SELECT MAX(id) AS id FROM pack WHERE draft_id = ?',
      [draft_id],
      (err, row) => {
        resolve(row.id);
      }
    )
  });
}

function getPackNames(pack_id) {
  return new Promise(resolve => {
    db.all(
      'SELECT row, col, name FROM pack_card JOIN card on pack_card.card_id = card.id WHERE pack_id = ? ORDER BY row, col',
      [pack_id],
      (err, rows) => {
        resolve(_.chunk(rows.map((card) => card.name), 3));
      }
    )
  })
}

db.serialize(function() {
  cleanupDb();
  const cubelist = createCards();
  createDraft(cubelist);
});

app.get('/api/hello', (req, res) => {
  res.send({ express: 'Hello From Express' });
});

app.get('/api/current_pack', (req, res) => {
  getCurrentDraft()
   .then(draft_id => getCurrentPack(draft_id))
   .then(pack_id => getPackNames(pack_id))
   .then(pack_names => res.send(get_pack_from_names(pack_names)));
});

app.post('/api/new_pack', (req, res) => {
  getCurrentDraft()
    .then(draft_id => createPack(draft_id));

  res.send({});
});

app.listen(port, () => console.log(`Listening on port ${port}`));
