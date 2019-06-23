var _ = require("underscore");

var GridDraft = require('../models/grid_draft');
var GlimpseDraft = require('../models/glimpse_draft');

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
    return await this
      .$relatedQuery('players')
      .resultSize();
  }

  mapping () {
   return _.pick(this, ['id', 'current_seat_number', 'started']);
  }

  async computedMapping() {
    const mapping = this.mapping();
    mapping.playerCount = await this.getPlayerCount();
    return mapping;
  }

  getDraftType() {
    switch(this.type) {
      case "grid":
        return GridDraft;
      case "glimpse":
        return GlimpseDraft;
    }
  }

  async getDraft() {
    try {
      return await this.getDraftType()
        .query()
        .where({draft_lobby_id: this.id})
        .first()
    } catch (e) {
      console.log("No matching draft", e);
      throw e;
    }
  }

  async createDraft() {
    return await this.getDraftType().createDraft(this);
  }

  async takeCards(count, trx) {
    const shuffled_cards = await this
      .$relatedQuery('shuffled_cards', trx)
      .orderBy('position')
      .limit(count);
    for (i = 0; i < shuffled_cards.length; i++) {
      const card = shuffled_cards[i];
      await this
        .$relatedQuery('shuffled_cards', trx)
        .unrelate()
        .where('id', card.id)
    }
    return shuffled_cards;
  }
}

module.exports = DraftLobby;
