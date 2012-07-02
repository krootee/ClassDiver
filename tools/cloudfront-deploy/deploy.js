var inspect = require('eyes').inspector(),
    awssum = require('awssum'),
    amazon = awssum.load('amazon/amazon'),
    S3 = awssum.load('amazon/s3').S3,
    fs = require('fs'),
    path = require('path'),
    wrench = require("wrench");

var accessKeyId = "AKIAJDPNLVY6FJSOTFHA";
var secretAccessKey = "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";

var s3 = new S3({
    'accessKeyId' : accessKeyId,
    'secretAccessKey' : secretAccessKey,
    'region' : amazon.US_EAST_1
});

console.log('Region :', s3.region());
console.log('EndPoint :',  s3.host());
console.log('AccessKeyId :', s3.accessKeyId());

var today = new Date();
var s3BucketName = "www.classdiver.com-" + today.getUTCFullYear() + "." + (today.getUTCMonth() + 1) + "." + today.getUTCDate() +
    "t" + today.getUTCHours() + "." + today.getUTCMinutes() + "." + today.getUTCSeconds();
//var s3BucketName = "www.classdiver.com-1235999432";

s3.CreateBucket({ BucketName : s3BucketName, Acl: "public-read" }, function(err, data) {
    if (err) {
        console.log("\n Problem with creation bucket '" + s3BucketName + "'.");
        inspect(err, 'Error');
        return;
    }

    console.log("\nBucket " + data.Headers.location + " created successfully.");
    inspect(data, 'Data');

    var sourceDir = ".//..//..//webroot";
    var files = wrench.readdirSyncRecursive(sourceDir);

    if (files) {
        inspect(files, "Files");

        files.map(function (file) {
            var filePath = path.join(sourceDir, file);
            var fileInfo = fs.statSync(filePath);
            var filesContent = {};
            var fileCounter = 0;

           // Exclude IDEA files and directories
           if ((file.indexOf(".idea") !== 0) && (!fileInfo.isDirectory())) {
               filesContent[fileCounter] = {};
               filesContent[fileCounter].bodyStream = fs.createReadStream(filePath);
               // replace \ with / if we are running on Windows - S3 has folders, but they are automatically created by having full path to filename with / in it
               file = file.replace(/\\/g, "/");
               console.log(file);
               // TODO - must setup proper Content-Type for each file
               filesContent[fileCounter].options = {
                       BucketName: s3BucketName,
                       Acl: "public-read",
                       // ContentType: defaults.ContentType,
                       ObjectName: file,
                       ContentLength: fileInfo.size,
                       Body: filesContent[fileCounter].bodyStream
                   };

               s3.PutObject(filesContent[fileCounter].options, function (err, data) {
                   if (err) {
                       inspect(err, "Error during upload");
                       return;
                   }

                   inspect(data, "Successful upload");
               });

               fileCounter++;
           }
        });
    }
});
