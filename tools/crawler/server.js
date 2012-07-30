var Coursera = require('./coursera.js').Coursera;
var args = process.argv.slice(2);
// accessKeyId, secretAccessKey
var dbutils = require('./dbutils.js').init(args[0], args[1]);
new Coursera(dbutils).load();
