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
        table.scan({
                    Id: {">=": 1}
                   })
            .fetch(function (err, items) {
                if (err) {
                    return console.error(err);
                }

                console.log(items);
                console.log(items.length);
                socket.emit('veriteco_data', items);
            });
    });
});

db.fetch(function(err) {
    if (err) {
        return console.error(err);
    }

    var tableCount = Object.keys(db.tables).length;

    console.log("Course DynamoDB has %s tables.", tableCount);
})
