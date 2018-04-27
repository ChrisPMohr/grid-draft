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
        player_number: { type: 'integer' }
      }
    };
  }

  static get relationMappings() {
    return {
      draft: {
        relation: Model.BelongsToOneRelation,
        modelClass: __dirname + '/draft',
        join: {
          from: 'decklists.draft_id',
          to: 'drafts.id'
        }
      },
      cards: {
        relation: Model.ManyToManyRelation,
        modelClass: __dirname + '/card',
        join: {
          from: "decklists.id",
          through: {
            from: "decklist_cards.pack_id",
            to: "decklist_cards.card_id"
          },
          to: "cards.id"
        }
      }
    };
  }
}

module.exports = Decklist;
