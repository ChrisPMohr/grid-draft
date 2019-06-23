'use strict';

var _ = require("underscore");


const Model = require('objection').Model;

class GridDraftPack extends Model {
  static get tableName() {
    return 'grid_draft_packs';
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        selected_col: { type: 'integer' },
        selected_row: { type: 'integer' },
        pack_number: { type: 'integer' },
        draft_id: { type: 'integer' }
      }
    };
  }

  static get relationMappings() {
    return {
      draft: {
        relation: Model.BelongsToOneRelation,
        modelClass: __dirname + '/grid_draft',
        join: {
          from: 'grid_draft_packs.draft_id',
          to: 'grid_drafts.id'
        }
      },
      cards: {
        relation: Model.ManyToManyRelation,
        modelClass: __dirname + '/card',
        join: {
          from: "grid_draft_packs.id",
          through: {
            from: "grid_draft_pack_cards.pack_id",
            to: "grid_draft_pack_cards.card_id",
            extra: ["row", "col", "selected"],
            modelClass: __dirname + '/grid_draft_pack_card'
          },
          to: "cards.id"
        }
      }
    };
  }

  async getCardsJson() {
    const cards = await this
      .$relatedQuery('cards')
      .orderBy(['row', 'col'])
    return _.chunk(
      cards.map((card) => (
        {
          name: card.name,
          selected: card.selected,
          url: card.image_url
        })
      ), 3);
  }
}

module.exports = GridDraftPack;
