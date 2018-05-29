var _ = require("underscore");

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
        id: { type: 'integer' },
        current_seat_number: { type: 'integer' }
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
      },
      decklists: {
        relation: Model.HasManyRelation,
        modelClass: __dirname + '/decklist',
        join: {
          from: 'drafts.id',
          to: 'decklists.draft_id'
        }
      },
      shuffled_cards: {
        relation: Model.ManyToManyRelation,
        modelClass: __dirname + '/card',
        join: {
          from: "drafts.id",
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
          from: "drafts.id",
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

  mapping () {
   return _.pick(this, ['id', 'current_seat_number']);
  }

  async computedMapping() {
    const mapping = this.mapping();
    mapping.playerCount = await this.getPlayerCount();
    return mapping;
  }
}

module.exports = Draft;
