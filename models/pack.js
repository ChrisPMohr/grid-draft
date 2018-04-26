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

  static get relationMappings() {
    return {
      draft: {
        relation: Model.BelongsToOneRelation,
        modelClass: __dirname + '/draft',
        join: {
          from: 'packs.draft_id',
          to: 'drafts.id'
        }
      }
    }
  }
}

module.exports = Pack;
