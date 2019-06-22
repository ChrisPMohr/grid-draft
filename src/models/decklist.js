'use strict';

const Model = require('objection').Model;

class Decklist extends Model {
  static get tableName() {
    return 'decklists';
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        draft_id: { type: 'integer' },
        seat_number: { type: 'integer' }
      }
    };
  }

  static get relationMappings() {
    return {
      draft_lobby: {
        relation: Model.BelongsToOneRelation,
        modelClass: __dirname + '/draft_lobby',
        join: {
          from: 'decklists.draft_id',
          to: 'draft_lobbies.id'
        }
      },
      cards: {
        relation: Model.ManyToManyRelation,
        modelClass: __dirname + '/card',
        join: {
          from: "decklists.id",
          through: {
            from: "decklist_cards.decklist_id",
            to: "decklist_cards.card_id",
            extra: ["pick_number"]
          },
          to: "cards.id"
        }
      },
      user: {
        relation: Model.HasOneThroughRelation,
        modelClass: __dirname + '/user',
        join: {
          from: ["decklists.draft_id", "decklists.seat_number"],
          through: {
            from: ["draft_player_seats.draft_id", "draft_player_seats.seat_number"],
            to: "draft_player_seats.user_id"
          },
          to: "users.id"
        }
      }
    };
  }
}

module.exports = Decklist;
