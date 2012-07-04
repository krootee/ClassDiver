var inspect = require('eyes').inspector(),
    awssum = require('awssum'),
    amazon = awssum.load('amazon/amazon'),
    S3 = awssum.load('amazon/s3').S3,
    cloudfront = require('cloudfront'),
    fs = require('fs'),
    path = require('path'),
    wrench = require("wrench"),
    mime = require("mime"),
    async = require('async');

var accessKeyId = "AKIAJDPNLVY6FJSOTFHA";
var secretAccessKey = "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";
var distributionId = "E1K1S9OYME1UBU";

var s3 = new S3({
    'accessKeyId' : accessKeyId,
    'secretAccessKey' : secretAccessKey,
    'region' : amazon.US_EAST_1
});

var cfClient = cloudfront.createClient(accessKeyId, secretAccessKey);

console.log('Region :', s3.region());
console.log('EndPoint :',  s3.host());
console.log('AccessKeyId :', s3.accessKeyId());

var today = new Date();
var s3BucketName = "www.classdiver.com_" + today.getUTCFullYear() + "-" + (today.getUTCMonth() + 1) + "-" + today.getUTCDate() +
    "t" + today.getUTCHours() + "." + today.getUTCMinutes() + "." + today.getUTCSeconds();
var distributionConfig = {};
var uploadedFiles = [];

async.series({
    createBucket: function(callback) {
        s3.CreateBucket({ BucketName : s3BucketName, Acl: "public-read" }, function(err, data) {
            if (err) {
                console.log("\n Problem with creation bucket '" + s3BucketName + "'.");
                callback(err, false);
            }

            console.log("\nBucket " + data.Headers.location + " created successfully.");
            inspect(data, 'Data');
            callback(null, true);
        });
    },
    uploadFiles: function(callback) {
        var filesContent = [];
        var fileCounter = 0;
        var uploadErrors = 0;
        var sourceDir = ".//..//..//webroot";
        var files = wrench.readdirSyncRecursive(sourceDir);

        if (files) {
            files.map(function (file) {
                var filePath = path.join(sourceDir, file);
                var fileInfo = fs.statSync(filePath);

                // Exclude IDEA files and directories
                if ((file.indexOf(".idea") !== 0) && (!fileInfo.isDirectory())) {
                    // replace \ with / if we are running on Windows - S3 has folders, but they are automatically created by having full path to filename with / in it
                    file = file.replace(/\\/g, "/");
                    console.log(file);

                    var fileOptions = {
                        BucketName : s3BucketName,
                        Acl : "public-read",
                        ContentType : mime.lookup(filePath),
                        ObjectName : file,
                        ContentLength : fileInfo.size,
                        Body : fs.createReadStream(filePath)
                    };

                    filesContent.push(fileOptions);
                    uploadedFiles.push(file);
                    fileCounter++;
                }
            });

            // do async parallel upload of files, but not start distribution config changes until all files are uploaded
            async.forEach(
                filesContent,
                function(item, callbackFile) {
                    s3.PutObject(item, function (err, data) {
                        if (err) {
                            inspect(err, "Error during upload of file " + item.ObjectName);
                            uploadErrors++;
                        }
                        else {
                            inspect(data, "Successful upload of file " + item.ObjectName);
                        }

                        callbackFile(err);
                    });
                },
                function(err) {
                    if (uploadErrors > 0) {
                        console.log("Upload failed for " + uploadErrors + " files.");
                    }

                    callback(err, (err === null));
            });
        }
    },
    getCloudFrontDistributionConfig: function(callback) {
        cfClient.getDistributionConfig(distributionId, function(err, data) {
            if (err) {
                console.log("Error loading distribution config");
                callback(err, false);
                return;
            }

            distributionConfig = data;
            inspect(distributionConfig, "Distribution config");

            callback(null, true);
        });
    },
    updateCloudFrontDistributionConfig: function(callback) {
        distributionConfig.origins[0].domainName = s3BucketName + ".s3.amazonaws.com";
        cfClient.setDistributionConfig(distributionId, distributionConfig, distributionConfig.etag, function (err, data) {
            if (err) {
                console.log("Error setting distribution config");
                callback(err, false);
                return;
            }

            inspect(data, "Successfully updated distribution config");
            callback(null, true);
        });
    },
    invalidateFiles: function(callback) {
        inspect(uploadedFiles, "Files to invalidate");
        var filesToInvalidate = [];
        uploadedFiles.map(function(file) {
            filesToInvalidate.push("/" + file);
        });
        cfClient.createInvalidation(distributionId, today.getTime().toString(), filesToInvalidate, function(err, result){
            if (err) {
                console.log("Failed to invalidate files");
                callback(err, false);
                return;
            }
            inspect(result, "Invalidation was successful");
            callback(null, true);
        })
    }
},
function(err, results) {
    if (err) {
        inspect(err);
    }
});
