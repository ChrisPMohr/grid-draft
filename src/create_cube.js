var fs = require("fs");

var Knex = require('knex');
var knexConfig = require('./knexfile');
var { Model } = require('objection');
var sqlite3 = require('sqlite3').verbose()

var Card = require('./models/card');

const knex = Knex(knexConfig.development);
const cardsData = Knex(knexConfig.cardsData);

Model.knex(knex);

async function cleanupCube() {
  await Card.query().delete();
}

async function getCardManaCost(cardName) {
  if (cardName.indexOf("//") != -1) {
    const splitNames = cardName.split(" // ");
    const manaCost1 = await getManaCost(splitNames[0]);
    const manaCost2 = await getManaCost(splitNames[1]);
    return manaCost1 + " // " + manaCost2;
  } else {
    return await getManaCost(cardName);
  }
}

async function getManaCost(cardName) {
  const response = await cardsData
    .from("cards")
    .select("manaCost")
    .where("name", cardName)
    .whereNotNull("multiverseId")
    .orderBy("multiverseId", "asc")
    .first();
  if (response !== undefined) {
    return response.manaCost;
  } else {
    return null;
  }
}

// not currently used
async function createCube() {
  cubelist_path = "cubelist.txt"
  var cubelist = fs.readFileSync(cubelist_path).toString().trim().split('\n');

  for (var cardName of cubelist) {
    const manaCost = await getCardManaCost(cardName)
    const draft = await Card
      .query()
      .insert({name: cardName, mana_cost: manaCost});
  }

  return cubelist;
}

async function resetCube() {
  try {
    await cleanupCube();
    await createCube();
    console.log("Finished updating cube");
    process.exit()
  } catch (e) {
    console.log("Error while reseting cube", e);
  }
}

resetCube();
