var passport = require('passport')
var bcrypt = require('bcrypt')
var LocalStrategy = require('passport-local').Strategy

var requireLoggedIn = require('./middleware')

var User = require('../models/user');

passport.serializeUser(function (user, done) {
  done(null, user.id)
})

passport.deserializeUser(function (id, done) {
  User.query().findById(id).then(function (admin) {
    done(null, admin)
  })
})

function initPassport () {
  passport.use(new LocalStrategy(
    (username, password, done) => {
      User
        .query()
        .where('username', username)
        .first()
        .then(function (user) {
          if (!user) return done(null, false, { message: 'Unknown user' })

          user.verifyPassword(password, function (err, passwordCorrect) {
            if (err) { return done(err) }
            if (!passwordCorrect) { return done(null, false) }
            return done(null, user)
          })
        }).catch(function (err) {
          done(err)
        })
    }
  ))

  passport.requireLoggedIn = requireLoggedIn
}

module.exports = initPassport
