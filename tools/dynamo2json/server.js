var courseProviderInfo = {
    "Coursera": {
        Name : "Courera",
        Url: "Coursera.org",
        ColorIndex: 0,
        Media: "http://www.youtube.com/watch?v=PojLL3E-zk0",
        ActivitiesStart: "2011,10,30",
        Text: "<p>Online free education from <a href='http://stanford.edu/online/courses'>Stanford University</a>, <a href='https://www.coursera.org/princeton'>Princeton University</a>, <a href='https://www.coursera.org/umich'>University of Michigan</a>, <a href='https://www.coursera.org/penn'>University of Pennsylvania</a>.</p>"
    },
    "Udacity": {
        Name : "Udacity",
        Url: "Udacity.com",
        ColorIndex: 1,
        Media: "http://www.youtube.com/watch?v=1uoh20TKvK0",
        ActivitiesStart: "2011,10,30",
        Text: "<p>Online free education from <a href='http://www.udacity.com'>Udacity</a> - a digital university with the mission to democratize education.</p>"
    },
    "MITx": {
        Name : "MITx",
        Url: "MITx.mit.edu",
        ColorIndex: 2,
        Media: "http://www.youtube.com/watch?v=p2Q6BrNhdh8",
        ActivitiesStart: "2012,3,4",
        Text: "<p>Online free education from <a href='http://web.mit.edu/'>Massachusetts Institute of Technology</a> and <a href='http://www.harvard.edu/'>Harvard University</a>.</p>"
    },
    "Caltech": {
        Name : "Caltech",
        Url: "Caltech.edu",
        ColorIndex: 3,
        Media: "http://www.caltech.edu/sites/all/themes/caltech/images/logo.gif",
        ActivitiesStart: "2012,4,2",
        Text: "<p>Online free education from <a href='http://www.caltech.edu/'>California Institute of Technology</a>.</p>"
    },
    "Individual": {
        Name : "Courses offered by private parties",
        Url: "",
        ColorIndex: 4,
        Media: "",
        ActivitiesStart: "2012,4,15",
        Text: "<p>Online free education from private instructors/non-profit organizations.</p>"
    }
};

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
    console.log(items.length);

    var streams = {};
    var providers = {};

    var data = {};
    var timeline = {};
    timeline.headline = "Online courses";
    timeline.type = "default";
    timeline.startDate = "2011,10,30";
    timeline.text = "List of online courses from Coursera, Udacity, MITx, Caltech and individual instructors";
    timeline.date = [];

    items.forEach(function (item) {
        var course = {};

        // convert start/end dates from ISO 8601 "<year>-<month>-<day>" format to "<year>,<month>,<day>" control format
        // where month and day parts could not contain trailing 0
        course.startDate = isoDateToJson(item.Start);
        course.endDate = isoDateToJson(item.End);

        course.headline = item.Name;
        course.stream = item.Stream;
        course.provider = item.Platform;
        course.colorIndexId = courseProviderInfo[item.Platform].ColorIndex;
        course.text = "Taught at " + item.Platform + " by Instructor(s) " + item.Instructors + "<br><a href='" + item.Url + "'>Link</a>";

        // tag is not used, since currently it forces control to create separate lines for each tag and that doesnt scale
        // course.tag = item.Stream;

        course.asset = {};
        // if this is Coursera course then need to generate link to full image path
        if (item.Platform === "Coursera" && item.ImageUrl === "*") {
            var courseID = item.Url.slice(item.Url.lastIndexOf("/") + 1);
            course.asset.media = "https://s3.amazonaws.com/coursera/topics/" + courseID + "/large-icon.png";
        }
        else {
            course.asset.media = item.ImageUrl;
        }
        // For credit we will use course provider website or link URL in case its individual courses
        course.asset.credit = courseProviderInfo[item.Platform].Url;
        if (course.asset.credit === "") {
            course.asset.credit = item.Url;
        }

        // course.asset.caption = item.Stream;
        timeline.date.push(course);

        // now update arrays with providers and streams
        if (!streams[item.Stream]) {
            streams[item.Stream] = 1;
        }
        else {
            streams[item.Stream] += 1;
        }

        if (!providers[item.Platform]) {
            providers[item.Platform] = 1;
        }
        else {
            providers[item.Platform] += 1;
        }
    })

    data.courses = { timeline : timeline};

    // sort streams and providers by amount
    var sortStreams = [];
    for (var stream in streams) {
        sortStreams.push([stream, streams[stream]]);
    }
    sortStreams.sort(function (a, b) {
        return b[1] - a[1];
    });

    var sortProviders = [];
    for (var provider in providers) {
        sortProviders.push([provider, providers[provider]]);
    }
    sortProviders.sort(function (a, b) {
        return b[1] - a[1];
    });

    var mapStreams = sortStreams.map(function(stream) {
       return stream[0];
    });
    var mapProviders = sortProviders.map(function(provider) {
        return provider[0];
    });

    data.helper = { streams : mapStreams, providers : mapProviders };
    socket.emit('veriteco_data', data);
}

function isoDateToJson(date) {
    return date.replace(/(\d{4})-(\d{2})-(\d{2})/, function($0,$1,$2,$3) {
        return $1 + "," + String(Number($2)) + "," + String(Number($3));
    });
}

db.fetch(function(err) {
    if (err) {
        return console.error(err);
    }

    var tableCount = Object.keys(db.tables).length;

    console.log("Course DynamoDB has %s tables.", tableCount);
})
