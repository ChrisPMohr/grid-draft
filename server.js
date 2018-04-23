const express = require('express');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.static('public'))

app.get('/api/hello', (req, res) => {
  res.send({ express: 'Hello From Express' });
});

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

const static_pack_names = {
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


app.get('/api/static_pack', (req, res) => {
  res.send(get_pack_from_names(static_pack_names));
});

app.listen(port, () => console.log(`Listening on port ${port}`));
