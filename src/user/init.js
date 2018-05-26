const passport = require('passport')

function initUser (app) {
  app.get('/api/profile',
    passport.requireLoggedIn(),
    function (req, res) {
      res.send({'text': 'logged in profile', 'username': req.user.username});
  });

  app.post('/auth/login',
    passport.authenticate('local'),
    function (req, res) {
      res.send({"message": "auth succeeded"});
  });

  app.post('/auth/logout',
    passport.requireLoggedIn(),
    function (req, res) {
      req.logout();
      res.send({"message": "logout succeeded"});
  });
}


module.exports = initUser
