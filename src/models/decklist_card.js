'use strict';

const Model = require('objection').Model;

class DecklistCard extends Model {
  static get tableName() {
    return 'decklist_cards';
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        card_id: { type: 'integer' },
        draft_id: { type: 'integer' },
        pick_number: { type: 'integer' }
      }
    };
  }
}

module.exports = DecklistCard;
