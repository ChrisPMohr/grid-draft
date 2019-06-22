var _ = require("underscore");

'use strict';

const Model = require('objection').Model;

class DraftLobby extends Model {
  static get tableName() {
    return 'draft_lobbies';
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        started: { type: 'boolean' },
        type: {type: 'string'}
      }
    };
  }

  static get relationMappings() {
    return {
      decklists: {
        relation: Model.HasManyRelation,
        modelClass: __dirname + '/decklist',
        join: {
          from: 'draft_lobbies.id',
          to: 'decklists.draft_id'
        }
      },
      shuffled_cards: {
        relation: Model.ManyToManyRelation,
        modelClass: __dirname + '/card',
        join: {
          from: "draft_lobbies.id",
          through: {
            from: "shuffled_cube_cards.draft_id",
            to: "shuffled_cube_cards.card_id",
            extra: ["position"],
            modelClass: __dirname + '/shuffled_cube_card'
          },
          to: "cards.id"
        }
      },
      players: {
        relation: Model.ManyToManyRelation,
        modelClass: __dirname + '/user',
        join: {
          from: "draft_lobbies.id",
          through: {
            from: "draft_player_seats.draft_id",
            to: "draft_player_seats.user_id",
            extra: ["seat_number"],
            modelClass: __dirname + '/draft_player_seat'
          },
          to: "users.id"
        }
      }
    };
  }

  async getPlayerCount() {
    const response = await this
      .$relatedQuery('players')
      .count('* as playerCount');
    return response[0].playerCount;
  }
}

module.exports = DraftLobby;
