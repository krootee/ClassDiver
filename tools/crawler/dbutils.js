var inspect = require('eyes').inspector();
var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var SimpleDB = awssum.load('amazon/simpledb').SimpleDB;
var sdbopts = require('./simpledb-access.js');
if (!sdbopts.accessKeyId) {
	throw 'Coursera: accessKeyID is required';
}
if (!sdbopts.secretAccessKey) {
	throw 'Coursera: secretAccessKey is required';
}
var sdb = new SimpleDB(sdbopts);

exports.putCourse = function(course, manual) {
	var instructors = course.instructors || [];
	sdb.PutAttributes({
		DomainName : (manual == true ? 'CoursesMan' : 'CoursesAuto'),
		ItemName : course.id,
		AttributeName : [ "startDate", "endDate", "title", "description", "stream", "provider", "media" ]
				.concat(new Array(1 + instructors.length).join(' instructor').split(' ').slice(1)),
		AttributeValue : [ course.startDate, course.endDate, course.title, course.description, course.stream,
				course.provider, course.media ].concat(instructors),
		AttributeReplace : [ true, true, true, true, true, true, true ].concat(new Array(1 + instructors.length).join(
				' true').split(' ').slice(1))
	}, function(err, data) {
		inspect(err, 'Error');
		inspect(data, 'Data');
	});
};

exports.getCourse = function(cb, key, manual) {
	sdb.GetAttributes({
		DomainName : (manual == true ? 'CoursesMan' : 'CoursesAuto'),
		ItemName : key,
		ConsistentRead : true
	}, function(err, data) {
		if (err) {
			inspect(err, 'Error');
			cb();
		}
		cb(toCourseJSON(data));
	});
};

exports.getAllCourses = function(cb, manual) {
	sdb.Select({
		SelectExpression : 'SELECT * FROM ' + (manual == true ? 'CoursesMan' : 'CoursesAuto'),
		ConsistentRead : true
	}, function(err, data) {
		if (err) {
			inspect(err, 'Error');
			cb();
		}
		cb(toCourseJSON(data));
	});
};

function toCourseJSON(dbResponse) {
	inspect(dbResponse, 'Data');
	var result = [];
	var items = dbResponse.Body.SelectResponse.SelectResult.Item;
	if (!items) {
		return result;
	}
	items = [].concat(dbResponse.Body.SelectResponse.SelectResult.Item);
	for (i in items) {
		var item = items[i];
		var course = {
			id : item.Name
		};
		for (j in item.Attribute) {
			var attr = item.Attribute[j];
			course[attr.Name] = attr.Value;
		}
		result.push(course);
	}
	return result;
}
