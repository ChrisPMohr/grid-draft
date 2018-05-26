module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: "./dev.db"
    },
    useNullAsDefault: true
  }
}
