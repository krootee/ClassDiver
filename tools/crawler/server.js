var dbutils = require('./dbutils.js');
var Coursera = require('./coursera.js').Coursera;
var Udacity = require('./udacity.js').Udacity;

new Coursera().load(function(c1) {
	new Udacity().load(function(c2) {
		var result = dbutils.mergeCourses(dbutils.mergeCourses({}, c1), c2);
		dbutils.getAllCoursesFromDB(function(coursesMan) {
			dbutils.mergeCourses(result, coursesMan);
			var filename = new Date().toISOString().replace(/\W/g, "_");
			dbutils.writeSnapshot(result, filename);
		}, true);
	});
});

// TODO
// 1. merge courses to single automatic snapshot (DONE)
// 2. write snapshot to file, add reference to db (in progress...)
// 3. calculate delta against previous snapshot
// 4. if difference send delta for review
