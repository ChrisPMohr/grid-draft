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
      }
    };
  }
}

module.exports = Draft;
