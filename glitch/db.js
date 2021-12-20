// establishes the connection
const postgres = require('postgres')

// elephant sql limits the number of connections you can have at the one time - amend accordingly allowing 1 per pi device
const sql = postgres(process.env.postgreSQLdb, {idle_timeout: 0, connect_timeout: 1, max:3});

module.exports = sql