var Coursera = require('./coursera.js').Coursera;
new Coursera().load(function(courses) {
	console.log(courses);
});
