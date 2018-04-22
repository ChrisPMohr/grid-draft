const express = require('express');

const app = express();
const port = process.env.PORT || 5000;

app.get('/api/hello', (req, res) => {
  res.send({ express: 'Hello From Express' });
});

const static_pack = {
  row_1: [
    {
      name: "Snapcaster Mage",
      url: "https://img.scryfall.com/cards/normal/en/mm3/50.jpg?1517813031"
    },
    {
      name: "Fyndhorn Elves",
      url: "https://img.scryfall.com/cards/normal/en/vma/210.jpg?1517813031"
    },
    {
      name: "Shriekmaw",
      url: "https://img.scryfall.com/cards/normal/en/cma/68.jpg?1519868787"
    }
  ],
  row_2: [
    {
      name: "Strip Mine",
      url: "https://img.scryfall.com/cards/normal/en/vma/316.jpg?1517813031"
    },
    {
      name: "Baleful Strix",
      url: "https://img.scryfall.com/cards/normal/en/e01/80.jpg?1517813031"
    },
    {
      name: "Snuff Out",
      url: "https://img.scryfall.com/cards/normal/en/gvl/53.jpg?1520561603"
    }
  ],
  row_3: [
    {
      name: "Maelstrom Pulse",
      url: "https://img.scryfall.com/cards/normal/en/mma/180.jpg?1517813031"
    },
    {
      name: "Looter il-Kor",
      url: "https://img.scryfall.com/cards/normal/en/td0/A25.jpg?1517813031"
    },
    {
      name: "Goblin Rabblemaster",
      url: "https://img.scryfall.com/cards/normal/en/ddt/46.jpg?1517813031"
    }
  ]
}


app.get('/api/static_pack', (req, res) => {
  res.send(static_pack);
});

app.listen(port, () => console.log(`Listening on port ${port}`));
