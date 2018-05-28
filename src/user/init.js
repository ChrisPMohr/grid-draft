var passport = require('passport')

var User = require('../models/user');

async function createUser(username, password) {
  const original_user = new User();
  original_user.username = username;
  original_user.password = password;
  const user = await User
    .query()
    .insert(original_user);
  return user
}

function initUser (app) {
  app.post('/api/user',
    (req, res) => {
      var username = req.body.username;
      var password = req.body.password;

      if (!username || !password) {
        error_message = "'username' and 'password' are required";
        console.log("POST /api/user error: " + error_message, req.body);
        res.status(400).send({'message': error_message});
      } else {
        createUser(username, password)
          .then(user => res.send(user.mapping()))
          .catch(e => {
            console.log("POST /api/user error: ", e);
            res.status(500).send({});
          });
      }
  });

  app.get('/api/me',
    passport.requireLoggedIn(),
    (req, res) => {
      res.send({"user": req.user.mapping()});
  });

  app.post('/auth/login',
    passport.authenticate('local'),
    (req, res) => {
      res.send({
        "message": "auth succeeded",
        "user": req.user.mapping()});
  });

  app.post('/auth/logout',
    passport.requireLoggedIn(),
    (req, res) => {
      req.logout();
      res.send({"message": "logout succeeded"});
  });
}


module.exports = initUser
