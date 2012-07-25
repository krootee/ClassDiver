var https = require('https');
var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var SimpleDB = awssum.load('amazon/simpledb').SimpleDB;

var sdb = new SimpleDB({
	'accessKeyId' : 'AKIAIFD7HX7CFW2OUZLA',
	'secretAccessKey' : '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',
	// 'awsAccountId' : 'my-aws-account-id', // optional
	'region' : amazon.US_EAST_1
});

var startId = 0;

exports.loadCourses = function() {
	https.get({
		host : 'www.coursera.org',
		path : '/maestro/api/topic/list?full=1',
		agent : false
	}, function(res) {
		res.setEncoding('utf8');
		var data = '';
		res.on('data', function(chunk) {
			// process.stdout.write(chunk + '\n');
			data += chunk;
		});
		res.on('end', function() {
			parseData(data);
		});
	}).on('error', function(e) {
		console.error(e);
	});
};

function parseData(data) {
	var arr = eval("(" + data + ")");
	// arr should be an array of courses
	for ( var i = 0; i < arr.length; i++) {
		for ( var j = 0; j < arr[i]['courses'].length; j++) {
			printOut(arr[i], arr[i]['courses'][j]);
		}
	}
}

function printOut(course, courseInst) {
	console.log('id=' + generateId());
	console.log('localId=' + courseInst['id']);
	console.log('startDate=' + courseInst['start_date_string']);
	console.log('endDate=' + courseInst['duration_string']);
	console.log('headline=' + (courseInst['name'] == '' ? course['name'] : courseInst['name']));
	console.log('stream=' + course['categories'][0]['name']);
	console.log('provider=Coursera');
	console.log('colorIndexId=0');
	console.log('text=Taught at Coursera by Instructor(s) ' + course['instructor'].replace('<br>', ', ')
			+ '<br><a href="' + course['social_link'] + '" target="_blank">Link</a>');
	console.log('instructors=' + course['instructor'].replace('<br>', ', '));
	console.log('asset_media=' + course['large_icon']);
	console.log('asset_credit=Coursera.org');
}

function insertToSimpleDb(course, courseInst) {
	sdb
			.PutAttributes(
					{
						DomainName : 'CoursesDelta',
						ItemName : '1',
						AttributeName : [ "localId", "startDate", "endDate", "headline", "stream", "provider",
								"colorIndexId", "text", "instructors", "instructors", "asset_media", "asset_credit" ],
						AttributeValue : [
								'123',
								'2012-09-29',
								'2013-02-10',
								'test',
								'test stream',
								'coursera',
								'0',
								'Taught at Coursera by Instructor(s) Nick Parlante<br><a href="https://www.coursera.org/course/cs101" target="_blank">Link</a>',
								'Kolja', 'Vasja',
								'https://s3.amazonaws.com/coursera/topics/automata/large-icon.png', 'Coursera.org' ],
						AttributeReplace : [ true, true, true, true, true, true, true, true, false, true, true, true ]
					}, function(err, data) {
						console.log('Error :', err);
						console.log('Data  :', data);
					});
}

function generateId() {
	return (++startId).toString();
}