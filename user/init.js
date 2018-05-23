const passport = require('passport')

function initUser (app) {
  app.get('/api/profile', passport.authenticationMiddleware(), renderProfile)
  app.post('/auth/login', passport.authenticate('local', {
    successRedirect: '/api/profile',
    failureRedirect: '/'
  }))
}

function renderProfile (req, res) {
  res.send({'text': 'logged in', 'username': req.user.username});
}

module.exports = initUser
