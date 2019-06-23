var _ = require("underscore");
var { transaction } = require('objection');

var PackCard = require('../models/pack_card');

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

  async getCurrentPack(user, trx) {
    try {
      return await this
        .$relatedQuery('packs', trx)
        .orderBy('id', 'desc')
        .limit(1)
        .first();
    } catch (e) {
      console.log("No current pack");
    }
  }

  async getCurrentState(user) {
    const pack = await this.getCurrentPack(user);
    const pack_cards_json = await pack.getCardsJson();

    return {
      cards: pack_cards_json,
      selected_row: pack.selected_row,
      selected_col: pack.selected_col,
      current_seat_number: this.current_seat_number,
      pack_number: pack.pack_number
    };
  }

  static async createDraft(draft_lobby) {
    try {
      const grid_draft = await GridDraft
        .query()
        .insert({draft_lobby_id: draft_lobby.id});
      return grid_draft;
    } catch (e) {
      console.log("Caught error creating grid_draft", e);
      throw e;
    }
  }

  async startDraft() {
    const updated_grid_draft = await this
      .$query()
      .patchAndFetch({current_seat_number: 0});

    try {
      await this.createPack();
    } catch (e) {
      console.log("Caught error creating pack", e);
      throw e;
    }
    return updated_grid_draft;
  }

  async createPack(trx) {
    const pack_count_response = await this.$relatedQuery('packs', trx).count();
    const pack_number = pack_count_response[0]['count(*)'] + 1;

    const pack = await this
      .$relatedQuery('packs', trx)
      .insert({pack_number: pack_number});
    const draft_lobby = await this.$relatedQuery('draft_lobby', trx);
    const shuffled_cards = await draft_lobby.takeCards(9, trx);
    for (i = 0; i < shuffled_cards.length; i++) {
      const card = shuffled_cards[i];
      const new_card = await pack
        .$relatedQuery('cards', trx)
        .relate(
          {
            id: card.id,
            row: Math.floor(i / 3),
            col: i % 3,
            selected: false
          }
        );
    }
  }

  async pickCards(body, user, refreshClient) {
    const row = body.row;
    const col = body.col;

    if (row) {
      var row_number = row - 1;
    } else {
      var col_number = col - 1;
    }
    const draft_lobby = await this.$relatedQuery('draft_lobby');

    const knex = GridDraft.knex();

    await transaction(knex, async (trx) => {
      const current_seat_number = this.current_seat_number;
      const current_player = await draft_lobby
        .$relatedQuery('players', trx)
        .where({seat_number: current_seat_number})
        .first();

      if (current_player.id !== user.id) {
        throw Error("Trying to pick cards for another player");
      }

      // get decklist for user + draft
      const decklist = await draft_lobby
        .$relatedQuery('decklists', trx)
        .where({seat_number: current_seat_number})
        .first();

      // get pack
      const pack = await this.getCurrentPack(user, trx);

      // get selected cards
      var cards;
      if (row) {
        if (pack.selected_row === row_number) {
          throw Error("Row was already selected");
        }
        cards = await pack
          .$relatedQuery('cards', trx)
          .where({row: row_number, selected: false});
      } else {
        if (pack.selected_col === col_number) {
          throw Error("Column was already selected");
        }
        cards = await pack
          .$relatedQuery('cards', trx)
          .where({col: col_number, selected: false});
      }

      // add cards into decklist
      for (var card of cards) {
        await PackCard
          .query(trx)
          .patch({selected: true})
          .where({card_id: card.id});

        await decklist
          .$relatedQuery('cards', trx)
          .relate({
              id: card.id,
              pick_number: pack.pack_number});
      }

      // update turn in draft
      const is_first_pick = isFirstPick(pack);
      const other_seat_number = getOtherSeatNumber(current_seat_number)
      if (is_first_pick) {
        // If first pick on this pack, flip the current player
        await this
          .$query(trx)
          .patch({current_seat_number: other_seat_number});
        refreshClient(other_seat_number);
      } else {
        // Keep player number the same and create a new pack
        await this.createPack(trx);
        refreshClient(other_seat_number);
      }

      // update pack (mark as selected or make new pack)
      if (is_first_pick) {
        if (row) {
          await pack
            .$query(trx)
            .patch({selected_row: row_number});
        } else {
          await pack
            .$query(trx)
            .patch({selected_col: col_number});
        }
      }
    });
  }
}

function isFirstPick(pack) {
  return pack.selected_row == null && pack.selected_col == null;
}

function getOtherSeatNumber(seat_number) {
  return 1 - seat_number
}

module.exports = GridDraft;
