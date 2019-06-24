var _ = require("underscore");
var { transaction } = require('objection');

var GlimpseDraftPackCard = require('../models/glimpse_draft_pack_card');

'use strict';

const Model = require('objection').Model;

class GlimpseDraft extends Model {
  static get tableName() {
    return 'glimpse_drafts';
  }

  static get jsonSchema() {
    return {
      type: 'object',

      properties: {
        id: { type: 'integer' },
        draft_lobby_id: { type: 'integer' }
      }
    };
  }

  static get relationMappings() {
    return {
      packs: {
        relation: Model.HasManyRelation,
        modelClass: __dirname + '/glimpse_draft_pack',
        join: {
          from: 'glimpse_drafts.id',
          to: 'glimpse_draft_packs.draft_id'
        }
      },
      draft_lobby: {
        relation: Model.BelongsToOneRelation,
        modelClass: __dirname + '/draft_lobby',
        join: {
          from: 'glimpse_drafts.draft_lobby_id',
          to: 'draft_lobbies.id'
        }
      }
    };
  }

  async getPackNumber(trx) {
    if (await this.$relatedQuery('packs', trx).resultSize()) {
      const latest_pack = await this
        .$relatedQuery('packs', trx)
        .orderBy('pack_number', 'desc')
        .first();
      return latest_pack.pack_number;
    } else {
      return 0;
    }
  }

  async getCurrentPack(user_seat_number, user, trx) {
    try {
      // Get user's seat number
      const draft_lobby = await this.$relatedQuery('draft_lobby');
      const is_player_in_seat = await draft_lobby.isPlayerInSeat(
        user, user_seat_number, trx);
      if (!is_player_in_seat) {
        throw Error("Trying to view pack for another player");
      }

      // Get highest pack_number packs with that seat number
      const pack_number = await this.getPackNumber(trx);
      const user_packs = await this
        .$relatedQuery('packs', trx)
        .where({current_seat_number: user_seat_number, pack_number: pack_number});

      // Pick the one with the higheset getNumCards
      var max_num_cards = 0;
      var max_pack = null;
      for (var pack of user_packs) {
        const num_cards = await pack.getNumCards(trx);
        if (num_cards > max_num_cards) {
          max_num_cards = num_cards;
          max_pack = pack;
        }
      }
      return pack;
    } catch (e) {
      console.log("No current pack");
      console.log(e);
    }
  }

  async getCurrentState(seat_number, user) {
    const pack = await this.getCurrentPack(seat_number, user);
    const pack_cards_json = await pack.getCardsJson();

    return {
      cards: pack_cards_json,
      pack_number: pack.pack_number,
    };
  }

  static async createDraft(draft_lobby) {
    try {
      const glimpse_draft = await GlimpseDraft
        .query()
        .insert({draft_lobby_id: draft_lobby.id});
      return glimpse_draft;
    } catch (e) {
      console.log("Caught error creating glimpse_draft", e);
      throw e;
    }
  }

  async startDraft() {
    try {
      await this.createPacks();
    } catch (e) {
      console.log("Caught error creating packs", e);
      throw e;
    }
    return this;
  }

  async createPacks(trx) {
    const pack_number = (await this.getPackNumber(trx)) + 1;
    const draft_lobby = await this.$relatedQuery('draft_lobby', trx);

    for (var seat_number = 0; seat_number < 2; seat_number++) {
      const pack = await this
        .$relatedQuery('packs', trx)
        .insert({
          pack_number: pack_number,
          original_seat_number: seat_number,
          current_seat_number: seat_number
        });
      const shuffled_cards = await draft_lobby.takeCards(15, trx);
      for (var i = 0; i < shuffled_cards.length; i++) {
        const card = shuffled_cards[i];
        const new_card = await pack
          .$relatedQuery('cards', trx)
          .relate(
            {
              id: card.id,
              is_available: true,
              card_number: i
            }
          );
      }
    }
  }

  async pickCards(body, seat_number, user, refreshClient) {
    const selected_card_number = body.selected_card_number;
    const burned_card_numbers = body.burned_card_numbers;

    const draft_lobby = await this.$relatedQuery('draft_lobby');

    const knex = GlimpseDraft.knex();

    await transaction(knex, async (trx) => {
      const pack = await this.getCurrentPack(seat_number, user, trx);

      if (pack === null) {
        throw Error("No pack to pick from");
      }

      const user_with_seat_number = await draft_lobby
        .$relatedQuery('players', trx)
        .where({user_id: user.id})
        .first();
      const user_seat_number = user_with_seat_number.seat_number

      // get decklist for user + draft
      const decklist = await draft_lobby
        .$relatedQuery('decklists', trx)
        .where({seat_number: current_seat_number})
        .first();

      // get selected card
      const selected_card = await pack
        .$relatedQuery('cards', trx)
        .where({card_number: selected_card_number})
        .first()

      // TODO: Fix this pack number, but it's not being used for anything
      await decklist
        .$relatedQuery('cards', trx)
        .relate({
            id: card.id,
            pick_number: pack.pack_number});

      // remove cards from pack
      burned_card_numbers.push(selected_card_number);
      await GlimpseDraftPackCard
        .query(trx)
        .patch({is_available: false})
        .where('pack_id', pack.id)
        .whereIn(card_number, burned_card_numbers);

      // update pack seat number
      const new_seat_number = getOtherSeatNumber(current_seat_number);
      await pack
        .$query(trx)
        .patch({current_seat_number: other_seat_number});

      // If all packs are done, start a new pack
      const pack_number = await this.getPackNumber(trx);
      const current_packs = await this
        .$relatedQuery('packs', trx)
        .where({pack_number: pack_number});

      var is_pack_done = true;
      for (var pack of current_packs) {
        const num_cards = await pack.getNumCards(trx);
        if (num_cards > 0) {
          is_pack_done = false;
          break;
        }
      }

      if (is_pack_done) {
        await this.createPacks(trx);
        // Update all players
        for (var seat_number = 0; seat_number < 2; seat_number++) {
          refreshClient(seat_number);
        }
      } else {
        // Update the player who is being passed to
        refreshClient(new_seat_number);
      }
    });
  }
}

function getOtherSeatNumber(seat_number) {
  return 1 - seat_number
}

module.exports = GlimpseDraft;
