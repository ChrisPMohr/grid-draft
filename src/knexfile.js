module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: "./dev.db"
    },
    useNullAsDefault: true
  },
  cardsData: {
    client: 'sqlite3',
    connection: {
      filename: "./AllSets.sqlite"
    },
    useNullAsDefault: true
  }
}
