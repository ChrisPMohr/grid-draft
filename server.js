var express = require('express');
var fs  = require("fs");
var _ = require("underscore");

const app = express();
const port = process.env.PORT || 5000;

app.use(express.static('public'))

function image_url(card_name) {
  return "/images/" + card_name
}

function get_pack_from_names(pack_names) {
  return {
    rows: pack_names.rows.map((row) =>
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

cubelist_path = "cubelist.txt"
var cubelist = fs.readFileSync(cubelist_path).toString().split('\n');

app.get('/api/hello', (req, res) => {
  res.send({ express: 'Hello From Express' });
});

app.get('/api/current_pack', (req, res) => {
  res.send(get_pack_from_names(current_pack_names));
});

app.post('/api/new_pack', (req, res) => {
  new_card_names = _.sample(cubelist, 9);
  current_pack_names = {
    rows: [
      new_card_names.slice(0, 3),
      new_card_names.slice(3, 6),
      new_card_names.slice(6, 9)
    ]
  };

  res.send({});
});

app.listen(port, () => console.log(`Listening on port ${port}`));
