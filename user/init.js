const passport = require('passport')

function initUser (app) {
  app.get('/api/profile', passport.authenticationMiddleware(), renderProfile);
  app.post('/api/login', passport.authenticate('local'),
    function (req, res) {
    res.send({"message": "auth succeeded"});
  });
}

function renderProfile (req, res) {
  res.send({'text': 'logged in profile', 'username': req.user.username});
}

module.exports = initUser
