const postgres = require('postgres')

const sql = postgres(process.env.postgreSQLdb, {idle_timeout: 0, connect_timeout: 1, max:1});

module.exports = sql