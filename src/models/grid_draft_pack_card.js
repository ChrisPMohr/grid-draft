'use strict';

const Model = require('objection').Model;

class GridDraftPackCard extends Model {
  static get tableName() {
    return 'grid_draft_pack_cards';
  }

  static get idColumn() {
    return ['pack_id', 'row', 'col'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['row', 'col', 'card_id', 'pack_id'],

      properties: {
        row: { type: 'integer' },
        col: { type: 'integer' },
        selected: { type: 'boolean' },
        card_id: { type: 'integer' },
        pack_id: { type: 'integer' }
      }
    };
  }
}

module.exports = GridDraftPackCard;
