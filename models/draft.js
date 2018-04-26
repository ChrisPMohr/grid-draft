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

  static get relationMappings() {
    return {
      packs: {
        relation: Model.HasManyRelation,
        modelClass: __dirname + '/pack',
        join: {
          from: 'drafts.id',
          to: 'packs.draft_id'
        }
      }
    }
  }
}

module.exports = Draft;
