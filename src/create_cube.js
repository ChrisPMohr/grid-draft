var fs = require("fs");
var https = require("https");

var Knex = require('knex');
var knexConfig = require('./knexfile');
var { Model } = require('objection');
var sqlite3 = require('sqlite3').verbose()

var Card = require('./models/card');

const knex = Knex(knexConfig.development);
const cardsData = Knex(knexConfig.cardsData);

Model.knex(knex);

SCRYFALL_API_DELAY = 100;

BANNED_SET_TYPE = ["from_the_vault", "masterpiece", "spellbook", "premium_deck"];

async function cleanupCube() {
  await Card.query().delete();
}

async function getCardData(cardName) {
  if (cardName.indexOf("//") != -1) {
    const splitNames = cardName.split(" // ");
    const cardData1 = await getCardFaceData(splitNames[0]);
    const cardData2 = await getCardFaceData(splitNames[1]);
    return {
      manaCost: cardData1.manaCost + " // " + cardData2.manaCost,
      scryfallId: cardData1.scryfallId
    };
  } else {
    return await getCardFaceData(cardName);
  }
}

function getCardFaceDataQuery(cardName) {
  return cardsData
    .from("cards")
    .join("sets", "cards.setCode", "sets.code")
    .select("manaCost", "scryfallId")
    .where("cards.name", cardName)
    .whereNotNull("multiverseId")
    .whereNotIn("sets.type", BANNED_SET_TYPE)
    .orderBy("multiverseId", "asc");
  }

async function getCardFaceData(cardName) {
  const newFrameCardData = await getNewFrameCardFaceData(cardName);
  if (newFrameCardData) {
    return newFrameCardData;
  } else {
    return await getAnyFrameCardFaceData(cardName);
  }
} 

async function getNewFrameCardFaceData(cardName) {
  return await getCardFaceDataQuery(cardName)
    .where("frameVersion", ">=", 2003)
    .where("borderColor", "black")
    .first();
}

async function getAnyFrameCardFaceData(cardName) {
  return await getCardFaceDataQuery(cardName).first();
}

function getImageUrl(scryfallId) {
  const imagePrefix = "https://img.scryfall.com/cards/normal/front/";
  const imageSuffix = ".jpg";
  const firstIdChar = scryfallId[0];
  const secondIdChar = scryfallId[1];
  const url = imagePrefix + firstIdChar + "/" + secondIdChar + "/" + scryfallId + imageSuffix;
  return url;
}

function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve,ms)
  })
}

async function downloadImage(cardName, imageUrl) {
  const downloadedFileDir = "/home/chris.pintz.mohr/downloaded_images/";
  const downloadedFileName = cardName.replace(" // ", "");
  const downloadedFilePath = downloadedFileDir + downloadedFileName;
  if (!fs.existsSync(downloadedFilePath)) {
    console.log(imageUrl);
    await sleep(SCRYFALL_API_DELAY);
    const file = fs.createWriteStream(downloadedFilePath);
    await https.get(imageUrl, function(response) {
      response.pipe(file);
    });
    console.log("Downloaded image for", cardName);
  }
}

async function createCube() {
  cubelist_path = "cubelist.txt"
  var cubelist = fs.readFileSync(cubelist_path).toString().trim().split('\n');

  for (var cardName of cubelist) {
    console.log(cardName);
    const cardData = await getCardData(cardName);
    const manaCost = cardData.manaCost;
    const imageUrl = getImageUrl(cardData.scryfallId);
    await downloadImage(cardName, imageUrl);

    const draft = await Card
      .query()
      .insert({name: cardName, mana_cost: manaCost});
  }

  await sleep(500);
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
