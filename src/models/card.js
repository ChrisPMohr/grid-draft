'use strict';

const Model = require('objection').Model;

class Card extends Model {
  static get tableName() {
    return 'cards';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],

      properties: {
        id: { type: 'integer' },
        name: { type: 'string' }
      }
    };
  }
}

module.exports = Card;