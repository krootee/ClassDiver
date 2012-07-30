var inspect = require('eyes').inspector();
var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var SimpleDB = awssum.load('amazon/simpledb').SimpleDB;
var sdb = null;

exports.init = function(accessKeyId, secretAccessKey) {
	if (!accessKeyId) {
		throw 'Coursera: accessKeyID is required';
	}
	if (!secretAccessKey) {
		throw 'Coursera: secretAccessKey is required';
	}
	sdb = new SimpleDB({
		'accessKeyId' : accessKeyId,
		'secretAccessKey' : secretAccessKey,
		// 'awsAccountId' : 'my-aws-account-id', // optional
		'region' : amazon.US_EAST_1
	});
	return this;
};

exports.putCourse = function(course, manual) {
	sdb.PutAttributes(
			{
				DomainName : (manual == true ? 'CoursesMan' : 'CoursesAuto'),
				ItemName : course.id,
				AttributeName : [ "startDate", "endDate", "title", "description", "stream", "provider", "instructors",
						"media" ],
				AttributeValue : [ course.startDate, course.endDate, course.title, course.description, course.stream,
						course.provider, course.instructors, course.media ],
				AttributeReplace : [ true, true, true, true, true, true, true, true ]
			}, function(err, data) {
				inspect(err, 'Error');
				inspect(data, 'Data');
			});
};

exports.getCourse = function(key, manual) {
	sdb.GetAttributes({
		DomainName : (manual == true ? 'CoursesMan' : 'CoursesAuto'),
		ItemName : key,
		ConsistentRead : true
	}, function(err, data) {
		inspect(err, 'Error');
		inspect(data, 'Data');
	});
};

exports.getAllCourses = function(cb, manual) {
	sdb.Select({
		SelectExpression : 'SELECT * FROM ' + (manual == true ? 'CoursesMan' : 'CoursesAuto'),
		ConsistentRead : true
	}, function(err, data) {
		inspect(err, 'Error');
		inspect(data, 'Data');
		cb(toCourseJSON(data));
	});
};

function toCourseJSON(dbResponse) {
	return null;
}
