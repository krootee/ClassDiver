var Coursera = require('./coursera.js').Coursera;
new Coursera(process.argv[2], process.argv[3]).load();
