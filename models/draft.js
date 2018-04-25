'use strict';

const Model = require('objection').Model;

class Draft extends Model {
  static get tableName() {
    return 'drafts';
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' }
      }
    };
  }
}

module.exports = Draft;
