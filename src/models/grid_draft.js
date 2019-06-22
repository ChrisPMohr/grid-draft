var _ = require("underscore");

'use strict';

const Model = require('objection').Model;

class GridDraft extends Model {
  static get tableName() {
    return 'grid_drafts';
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        current_seat_number: { type: 'integer' },
        draft_lobby_id: { type: 'integer' }
      }
    };
  }

  static get relationMappings() {
    return {
      packs: {
        relation: Model.HasManyRelation,
        modelClass: __dirname + '/pack',
        join: {
          from: 'grid_drafts.id',
          to: 'packs.draft_id'
        }
      },
      draft_lobby: {
        relation: Model.BelongsToOneRelation,
        modelClass: __dirname + '/draft_lobby',
        join: {
          from: 'grid_drafts.draft_lobby_id',
          to: 'draft_lobbies.id'
        }
      }
    };
  }

  async getPlayerCount() {
    const lobby = await this.$relatedQuery('draft_lobby');
    const response = await lobby
      .$relatedQuery('players')
      .count('* as playerCount');
    return response[0].playerCount;
  }

  async getStarted() {
    const lobby = await this
      .$relatedQuery('draft_lobby');
    return lobby.started;
  }


  mapping () {
   return _.pick(this, ['id', 'current_seat_number']);
  }

  async computedMapping() {
    const mapping = this.mapping();
    mapping.playerCount = await this.getPlayerCount();
    mapping.started = await this.getStarted();
    return mapping;
  }
}

module.exports = GridDraft;
