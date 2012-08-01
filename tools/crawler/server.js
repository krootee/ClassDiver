var Coursera = require('./coursera.js').Coursera;
var Udacity = require('./udacity.js').Udacity;

new Coursera().load(function(courses) {
	console.log(courses);
});

new Udacity().load(function(courses) {
	console.log(courses);
});

// TODO
// 1. merge courses to single automatic snapshot
// 2. write snapshot to file, add reference to db
// 3. calculate delta against previous snapshot
// 4. if difference send delta for review
