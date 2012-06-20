var courseProviderInfo = [
    {
        Name : "Courera",
        Url: "Coursera.org",
        Media: "http://www.youtube.com/watch?v=PojLL3E-zk0",
        ActivitiesStart: "2011,10,30",
        Text: "<p>Online free education from <a href='http://stanford.edu/online/courses'>Stanford University</a>, <a href='https://www.coursera.org/princeton'>Princeton University</a>, <a href='https://www.coursera.org/umich'>University of Michigan</a>, <a href='https://www.coursera.org/penn'>University of Pennsylvania</a>.</p>"
    },
    {
        Name : "Udacity",
        Url: "Udacity.com",
        Media: "http://www.youtube.com/watch?v=1uoh20TKvK0",
        ActivitiesStart: "2011,10,30",
        Text: "<p>Online free education from <a href='http://www.udacity.com'>Udacity</a> - a digital university with the mission to democratize education.</p>"
    },
    {
        Name : "MITx",
        Url: "MITx.mit.edu",
        Media: "http://www.youtube.com/watch?v=p2Q6BrNhdh8",
        ActivitiesStart: "2012,3,4",
        Text: "<p>Online free education from <a href='http://web.mit.edu/'>Massachusetts Institute of Technology</a> and <a href='http://www.harvard.edu/'>Harvard University</a>.</p>"
    },
    {
        Name : "Caltech",
        Url: "Caltech.edu",
        Media: "http://www.caltech.edu/sites/all/themes/caltech/images/logo.gif",
        ActivitiesStart: "2012,4,2",
        Text: "<p>Online free education from <a href='http://www.caltech.edu/'>California Institute of Technology</a>.</p>"
    },
    {
        Name : "Courses offered by private parties",
        Url: "",
        Media: "",
        ActivitiesStart: "2012,4,15",
        Text: "<p>Online free education from private instructors/non-profit organizations.</p>"
    }
];

var app = require('express').createServer(),
    io = require('socket.io').listen(app);
var dynamo = require('dynamo'),
    client = dynamo.createClient({accessKeyId: "AKIAI2NO4WLLHVLU5EHA", secretAccessKey: "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"}),
    db = client.get('us-east-1');

app.listen(80);

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/process_data.html');
});

io.sockets.on('connection', function (socket) {
    socket.on('get_veriteco_data', function () {
        var table = db.get("Courses");

        table.fetch(function (err, data) {
            if (err) {
                return console.error(err);
            }

            console.log(data);
        });
        table.scan({Id: {">=": 1}}).fetch(function (err, items) {
            if (err) {
                return console.error(err);
            }

            processAndSendData(socket, items);
        });
    });
});

function processAndSendData(socket, items) {
    console.log(items);
    console.log(items.length);

    courseProviderInfo.map(function (provider) {
        console.log(provider.Name);
    })

    var timeline = {};
    timeline.headline = "Online courses";
    timeline.type = "default";
    timeline.startDate = "2011,10,30";
    timeline.text = "List of online courses from Coursera, Udacity, MITx, Caltech and individual instructors.";
    timeline.date = [];

    items.map(function (item) {
        var course = {};
        course.headline = item.Name;

        // convert start/end dates from ISO 8601 "<year>-<month>-<day>" format to "<year>,<month>,<day>" control format
        // where month and day parts could not contain trailing 0
        course.startDate = item.Start.replace(/(\d{4})-(\d{2})-(\d{2})/, function($0,$1,$2,$3) {
            return $1 + "," + String(Number($2)) + "," + String(Number($3));
        });
        course.endDate = item.End.replace(/(\d{4})-(\d{2})-(\d{2})/, function($0,$1,$2,$3) {
            return $1 + "," + String(Number($2)) + "," + String(Number($3));
        });

        course.text = "<p>Course is organized by " + item.Platform + " and taught by Instructor(s) " + item.Instructors + "<br><a href='" + item.Url + "'>Link</a></p>";
        course.tag = item.Stream;
        course.asset = {};
        // if this is Coursera course then need to generate link to full image path
        if (item.Platform === "Coursera") {
            var parts = item.Url.split("/");
            var courseID = parts[parts.length - 1];
            course.asset.media = "https://s3.amazonaws.com/coursera/topics/" + courseID + "/large-icon.png";
        }
        else {
            course.asset.media = item.ImageUrl;
        }
        // For credit we will use course link URL
        course.asset.credit = item.Url;
        course.asset.caption = item.Stream;
        timeline.date.push(course);
    })

    var data = { timeline : timeline};
    socket.emit('veriteco_data', data);
}

db.fetch(function(err) {
    if (err) {
        return console.error(err);
    }

    var tableCount = Object.keys(db.tables).length;

    console.log("Course DynamoDB has %s tables.", tableCount);
})
