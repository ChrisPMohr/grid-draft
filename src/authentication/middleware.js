function requireLoggedIn () {
  return function (req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
    res.status(401).send({"message": "authentication is required"});
  }
}

module.exports = requireLoggedIn
