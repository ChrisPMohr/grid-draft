'use strict';

const Model = require('objection').Model;

class DraftPlayerSeat extends Model {
  static get tableName() {
    return 'draft_player_seats';
  }

  static get idColumn() {
    return ['draft_id', 'user_id'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['seat_number'],

      properties: {
        seat_number: { type: 'integer' },
        draft_id: { type: 'integer' },
        user_id: { type: 'integer' }
      }
    };
  }

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: __dirname + '/user',
        join: {
          from: 'draft_player_seats.user_id',
          to: 'users.id'
        }
      },
      draft: {
        relation: Model.BelongsToOneRelation,
        modelClass: __dirname + '/draft',
        join: {
          from: 'draft_player_seats.draft_id',
          to: 'drafts.id'
        }
      }
    };
  }
}

module.exports = DraftPlayerSeat;
