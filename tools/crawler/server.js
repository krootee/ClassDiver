var dbutils = require('./dbutils.js');
var Coursera = require('./coursera.js').Coursera;
var Udacity = require('./udacity.js').Udacity;

new Coursera().load(function(c1) {
	var u = new Udacity();
	u.load(function(c2) {
		var result = u.mergeCourses(u.mergeCourses({}, c1), c2);
		dbutils.getAllCourses(function(coursesMan) {
			u.mergeCourses(result, coursesMan);
			console.log(result);
		}, true);
	});
});

// TODO
// 1. merge courses to single automatic snapshot (DONE)
// 2. write snapshot to file, add reference to db
// 3. calculate delta against previous snapshot
// 4. if difference send delta for review
