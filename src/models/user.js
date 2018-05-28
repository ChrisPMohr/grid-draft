var _ = require("underscore");

'use strict';

const Model = require('objection').Model;
const bcrypt = require('bcrypt')

class User extends Model {
  static get tableName() {
    return 'users';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['username', 'hashed_password'],

      properties: {
        id: { type: 'integer' },
        username: { type: 'string' },
        hashed_password: { type: 'string' }
      }
    };
  }

  set password (password) {
    this.hashed_password = bcrypt.hashSync(password, bcrypt.genSaltSync(10))
  };

  verifyPassword (password, callback) {
    bcrypt.compare(password, this.hashed_password, callback)
  };


  mapping () {
   return _.pick(this, ['username', 'id']);
  }
}

module.exports = User;
