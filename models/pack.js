'use strict';

const Model = require('objection').Model;

class Pack extends Model {
  static get tableName() {
    return 'packs';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['draft_id'],

      properties: {
        id: { type: 'integer' },
        draft_id: { type: 'integer' }
      }
    };
  }
}

module.exports = Pack;
