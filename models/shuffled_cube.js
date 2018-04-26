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
      required: ['position'],

      properties: {
        position: { type: 'integer' },
        draft_id: { type: 'integer' },
        card_id: { type: 'integer' }
      }
    };
  }

  static get relationMappings() {
    return {
      card: {
        relation: Model.BelongsToOneRelation,
        modelClass: __dirname + '/card',
        join: {
          from: 'shuffled_cubes.card_id',
          to: 'cards.id'
        }
      },
      draft: {
        relation: Model.BelongsToOneRelation,
        modelClass: __dirname + '/draft',
        join: {
          from: 'shuffled_cubes.draft_id',
          to: 'drafts.id'
        }
      }
    };
  }
}

module.exports = ShuffledCube;
