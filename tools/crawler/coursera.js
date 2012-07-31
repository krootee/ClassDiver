var util = require("util");
var dbutils = require('./dbutils.js');
var https = require('https');
var Provider = require('./provider.js').Provider;
var mnths = [ 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec' ];

var Coursera = function() {
	var self = this;
	Coursera.super_.call(this);
	return self;
};

util.inherits(Coursera, Provider);

Coursera.prototype.load = function(cb) {
	https.get({
		host : 'www.coursera.org',
		path : '/maestro/api/topic/list?full=1',
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

exports.Coursera = Coursera;

function parseData(cb, data) {
	var courses = {};
	var arr = eval("(" + data + ")");
	// arr should be an array of courses
	for ( var i = 0; i < 10/* arr.length */; i++) {
		for ( var j = 0; j < arr[i]['courses'].length; j++) {
			var course = toCourseJSON(arr[i], arr[i]['courses'][j]);
			courses[course.id] = course;
		}
	}
	dbutils.getAllCourses(function(coursesMan) {
		Provider.prototype.mergeCourses.call(this, courses, coursesMan);
		cb(courses);
	}, true);
}

function toCourseJSON(course, courseInst) {
	var c = {};
	c.id = Provider.prototype.generateId.call(this, [ 'coursera', course['short_name'], courseInst['id'] ], ':');
	var startDate = dateStrToDate(courseInst['start_date_string']);
	if (startDate) {
		c.startDate = startDate.toISOString();
	}
	var dur = durationStrToDays(courseInst['duration_string']);
	var endDate = null;
	if (startDate && dur > 0) {
		endDate = startDate;
		endDate.setDate(endDate.getDate() + dur);
	}
	if (endDate) {
		c.endDate = endDate.toISOString();
	}
	c.title = (courseInst['name'] == '' ? course['name'] : courseInst['name']);
	c.category = [];
	for ( var i in course['categories']) {
		c.category.push(course['categories'][i]['name']);
	}
	c.provider = 'coursera';
	c.instructor = course['instructor'].replace('<br>', ', ');
	c.link = course['social_link'];
	c.icon = course['large_icon'];
	return c;
}

function durationStrToDays(durationStr) {
	return durationStr && durationStr.indexOf('weeks') >= 0 ? 7 * durationStr.split(' ')[0] : 0;
}

function dateStrToDate(dateStr) {
	if (!dateStr) {
		return null;
	}
	var strTmp = dateStr;
	strTmp = strTmp.replace(/\s{2,}|^\s|\s$/g, ' '); // unecessary spaces
	strTmp = strTmp.replace(/[\t\r\n]/g, ''); // unecessary chars
	strTmp = strTmp.trim();
	var fullDatePattern = new RegExp('^\\d{1,2}\\s(' + mnths.join('|') + ')[^\\s]*\\s\\d{4}$', 'gi');
	if (fullDatePattern.test(strTmp)) {
		var parts = strTmp.split(' ');
		var date = new Date();
		date.setUTCFullYear(parts[2]);
		date.setUTCMonth(mnths.indexOf(parts[1].slice(0, 3).toLowerCase()));
		date.setUTCDate(parts[0]);
		date.setUTCHours(0);
		date.setUTCMinutes(0);
		date.setUTCSeconds(0);
		date.setUTCMilliseconds(0);
		return date;
	}
	var monthYearPattern = new RegExp('^(' + mnths.join('|') + ')[^\\s]*\\s\\d{4}$', 'gi');
	if (monthYearPattern.test(strTmp)) {
		var parts = strTmp.split(' ');
		var date = new Date();
		date.setUTCFullYear(parts[1]);
		date.setUTCMonth(mnths.indexOf(parts[0].slice(0, 3).toLowerCase()));
		date.setUTCDate(1);
		date.setUTCHours(0);
		date.setUTCMinutes(0);
		date.setUTCSeconds(0);
		date.setUTCMilliseconds(0);
		return date;
	}
	return null;
}
