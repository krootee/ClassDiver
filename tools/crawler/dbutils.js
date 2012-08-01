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
	var attrNumber = 0;
	var attrNames = [];
	var attrValues = [];
	for ( var i in course) {
		// exclude id
		if (i == 'id') {
			continue;
		}
		var values = [].concat(course[i]);
		for ( var j in values) {
			attrNames.push(i);
			attrValues.push(values[j]);
			++attrNumber;
		}
	}
	// console.log(attrNames);
	// console.log(attrValues);
	// console.log(new Array(1 + attrNumber).join(' true').split(' ').slice(1));
	// console.log();
	sdb.PutAttributes({
		DomainName : (manual == true ? 'CoursesMan' : 'CoursesAuto'),
		ItemName : course.id,
		AttributeName : attrNames,
		AttributeValue : attrValues,
		AttributeReplace : new Array(1 + attrNumber).join(' true').split(' ').slice(1)
	}, function(err, data) {
		if (err) {
			inspect(err, 'Error');
		}
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
	// inspect(dbResponse, 'Data');
	var result = {};
	var items = dbResponse.Body.SelectResponse.SelectResult.Item;
	if (!items) {
		return result;
	}
	items = [].concat(dbResponse.Body.SelectResponse.SelectResult.Item);
	for ( var i in items) {
		var item = items[i];
		var course = {
			id : item.Name
		};
		for ( var j in item.Attribute) {
			var attr = item.Attribute[j];
			if (course[attr.Name]) {
				course[attr.Name] = [ course[attr.Name] ];
				course[attr.Name].push(attr.Value);
			} else {
				course[attr.Name] = attr.Value;
			}
		}
		result[course.id] = course;
	}
	return result;
}
