var inspect = require('eyes').inspector();
var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var SimpleDB = awssum.load('amazon/simpledb').SimpleDB;
var S3 = awssum.load('amazon/s3').S3;
var awsconfig = require('./aws-config.js');

if (!awsconfig.access.accessKeyId) {
	throw 'Coursera: accessKeyID is required';
}
if (!awsconfig.access.secretAccessKey) {
	throw 'Coursera: secretAccessKey is required';
}
var simpledb = new SimpleDB(awsconfig.access);
var s3 = new S3(awsconfig.access);

exports.putCourseToDB = function putCourseToDB(course) {
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
	simpledb.PutAttributes({
		DomainName : awsconfig.simpledb.COURSES_TABLE,
		ItemName : course.id,
		AttributeName : attrNames,
		AttributeValue : attrValues,
		AttributeReplace : new Array(1 + attrNumber).join(' true').split(' ')
				.slice(1)
	}, function(err, data) {
		if (err) {
			inspect(err, 'Error');
		}
	});
};

exports.getCourseFromDB = function getCourseFromDB(cb, key) {
	simpledb.GetAttributes({
		DomainName : awsconfig.simpledb.COURSES_TABLE,
		ItemName : key,
		ConsistentRead : true
	}, function(err, data) {
		if (err) {
			inspect(err, 'Error');
			cb({});
			return;
		}
		cb(toCourseJSON(data));
	});
};

exports.getAllCoursesFromDB = function getAllCoursesFromDB(cb) {
	simpledb.Select({
		SelectExpression : 'SELECT * FROM ' + awsconfig.simpledb.COURSES_TABLE,
		ConsistentRead : true
	}, function(err, data) {
		if (err) {
			inspect(err, 'Error');
			cb({});
			return;
		}
		cb(toCourseJSON(data));
	});
};

var toCourseJSON = function toCourseJSON(dbResponse) {
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
};

exports.mergeCourses = function mergeCourses(destination, source) {
	for ( var id in source) {
		destination[id] = {};
		for ( var prop in source[id]) {
			destination[id][prop] = source[id][prop];
		}
	}
	return destination;
};

exports.readSnapshot = function readSnapshot(cb) {
};

exports.writeSnapshot = function writeSnapshot(snapshot, name) {
	if (typeof snapshot === 'object') {
		snapshot = JSON.stringify(snapshot);
	} else if (!(typeof snapshot === 'string')) {
		snapshot = String(snapshot);
	}
	var options = {
		BucketName : awsconfig.s3.BUCKET_NAME,
		ObjectName : name + awsconfig.s3.FILENAME_SUFFIX,
		ContentLength : Buffer.byteLength(snapshot),
		Body : snapshot,
	};
	s3.PutObject(options, function(err, data) {
		if (err) {
			inspect(err, 'Error');
		}
	});
};
