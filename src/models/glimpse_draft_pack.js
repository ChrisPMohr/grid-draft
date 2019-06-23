'use strict';


const Model = require('objection').Model;

class GlimpseDraftPack extends Model {
  static get tableName() {
    return 'glimpse_draft_packs';
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        pack_number: { type: 'integer' },
        draft_id: { type: 'integer' },
        original_seat_number: { type: 'integer' },
        current_seat_number: { type: 'integer' }
      }
    };
  }

  static get relationMappings() {
    return {
      draft: {
        relation: Model.BelongsToOneRelation,
        modelClass: __dirname + '/glimpse_draft',
        join: {
          from: 'glimpse_draft_packs.draft_id',
          to: 'glimpse_drafts.id'
        }
      },
      cards: {
        relation: Model.ManyToManyRelation,
        modelClass: __dirname + '/card',
        join: {
          from: "glimpse_draft_packs.id",
          through: {
            from: "glimpse_draft_pack_cards.pack_id",
            to: "glimpse_draft_pack_cards.card_id",
            extra: ["is_available", "card_number"],
            modelClass: __dirname + '/glimpse_draft_pack_card'
          },
          to: "cards.id"
        }
      }
    };
  }

  async getNumCards(trx) {
    return await this
      .$relatedQuery('cards', trx)
      .where({is_available: true})
      .resultSize();
  }

  async getCardsJson() {
    const cards = await this
      .$relatedQuery('cards')
      .where({is_available: true})
      .orderBy('card_number')
    return cards.map((card) => (
      {
        name: card.name,
        url: card.image_url
      }));
  }
}

module.exports = GlimpseDraftPack;
