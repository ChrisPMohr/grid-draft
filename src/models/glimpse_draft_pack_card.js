'use strict';

const Model = require('objection').Model;

class GlimpseDraftPackCard extends Model {
  static get tableName() {
    return 'glimpse_draft_pack_cards';
  }

  static get idColumn() {
    return ['pack_id', 'card_number'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['card_number', 'is_available', 'card_id', 'pack_id'],

      properties: {
        card_number: { type: 'integer' },
        is_available: { type: 'boolean' },
        card_id: { type: 'integer' },
        pack_id: { type: 'integer' }
      }
    };
  }
}

module.exports = GlimpseDraftPackCard;
