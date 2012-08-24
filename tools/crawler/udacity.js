var util = require("util");
var http = require('http');
var Provider = require('./provider.js').Provider;

var Udacity = function() {
	var self = this;
	Udacity.super_.call(this);
	return self;
};

util.inherits(Udacity, Provider);

Udacity.prototype.load = function(cb) {
	http.get({
		host : 'www.udacity.com',
		path : '/courses',
		agent : false
	}, function(res) {
		res.setEncoding('utf8');
		var data = '';
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			parseData(cb, data);
		});
	}).on('error', function(e) {
		console.error(e);
	});
};

exports.Udacity = Udacity;

function parseData(cb, data) {
	var courses = {};
	var strTmp = data.slice(data.indexOf('PRELOADED_COURSES'));
	strTmp = strTmp.slice(0, strTmp.indexOf('</script>'));
	var PRELOADED_COURSES = eval('(' + strTmp + ')');
	for ( var i = 0; i < PRELOADED_COURSES.courses.length; i++) {
		var course = toCourseJSON(PRELOADED_COURSES.courses[i]);
		courses[course.id] = course;
	}
	cb(courses);
}

function toCourseJSON(course) {
	var c = {};
	c.id = Provider.prototype.generateId.call(this, [ 'udacity', course.id ],
			':');
	// var startDate = dateStrToDate(courseInst['start_date_string']);
	// if (startDate) {
	// c.startDate = startDate.toISOString();
	// }
	// var dur = durationStrToDays(courseInst['duration_string']);
	// var endDate = null;
	// if (startDate && dur > 0) {
	// endDate = startDate;
	// endDate.setDate(endDate.getDate() + dur);
	// }
	// if (endDate) {
	// c.endDate = endDate.toISOString();
	// }
	c.title = course.name + ': ' + course.title + ' (' + course.course_id + ')';
	c.category = [];
	for ( var i in course.tags.subjects) {
		c.category.push(course.tags.subjects[i]);
	}
	c.provider = 'udacity';
	c.instructor = [];
	for ( var i in course.instructors) {
		c.instructor.push(course.instructors[i].name);
	}
	c.link = 'http://www.udacity.com/overview/Course/' + course.id;
	c.icon = 'http://www.youtube.com/watch?v=' + course.teaser.youtube_id;
	return c;
}
