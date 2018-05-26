function requireLoggedIn () {
  return function (req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
    res.status(401).send({"message": "authenciation is required"});
  }
}

module.exports = requireLoggedIn
