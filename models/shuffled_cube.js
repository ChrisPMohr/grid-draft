'use strict';

const Model = require('objection').Model;

class ShuffledCube extends Model {
  static get tableName() {
    return 'shuffled_cubes';
  }

  static get idColumn() {
    return ['draft_id', 'position'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['position', 'draft_id', 'card_id'],

      properties: {
        position: { type: 'integer' },
        draft_id: { type: 'integer' },
        card_id: { type: 'integer' }
      }
    };
  }
}

module.exports = ShuffledCube;
