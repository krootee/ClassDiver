var inspect = require('eyes').inspector(),
    awssum = require('awssum'),
    amazon = awssum.load('amazon/amazon'),
    S3 = awssum.load('amazon/s3').S3,
    cloudfront = require('cloudfront'),
    fs = require('fs'),
    path = require('path'),
    wrench = require("wrench"),
    mime = require("mime"),
    async = require('async'),
    jsp = require("uglify-js").parser,
    pro = require("uglify-js").uglify;

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
var invalidationId = "";

async.series({
    createBucket: function(callback) {
        s3.CreateBucket({ BucketName : s3BucketName, Acl: "public-read" }, function(err, data) {
            if (err) {
                console.log("\n Problem with creation bucket '" + s3BucketName + "'.");
            }
            else {
                console.log("\nBucket " + data.Headers.location + " created successfully.");
                inspect(data, 'Data');
            }
            callback(err, (err === null));
        });
    },
    uploadFiles: function(callback) {
        var filesContent = [];
        var fileCounter = 0;
        var uploadErrors = 0;
        var sourceDir = ".//..//..//webroot";
        var files = wrench.readdirSyncRecursive(sourceDir);
        var tempFiles = [];

        if (files) {
            files.forEach(function (file) {
                var filePath = path.join(sourceDir, file);
                var fileInfo = fs.statSync(filePath);

                // Exclude IDEA files and directories
                if ((file.indexOf(".idea") !== 0) && (!fileInfo.isDirectory())) {
                    // replace \ with / if we are running on Windows - S3 has folders, but they are automatically created by having full path to filename with / in it
                    file = file.replace(/\\/g, "/");
                    console.log(file);

                    // If JavaScript file then minify it before upload
                    var extensionOffset = file.lastIndexOf('.');

                    if (extensionOffset > 0 && file.substr(extensionOffset + 1) === 'js') {
                        console.log('Reading file ' + filePath);
                        var jsBody = fs.readFileSync(filePath, 'utf8');
                        // Uglify.js magic
                        var ast = jsp.parse(jsBody); // parse code and get the initial AST
                        ast = pro.ast_mangle(ast); // get a new AST with mangled names
                        ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
                        var minifiedBody = pro.gen_code(ast); // compressed code here
                        console.log('Minification - initial size = ' + jsBody.length + ', output size = ' + minifiedBody.length);

                        // store in temporary file
                        filePath += '.temp';
                        fs.writeFileSync(filePath, minifiedBody);
                        fileInfo = fs.statSync(filePath);
                        tempFiles.push(filePath);
                    }

                    var fileOptions = {
                        BucketName : s3BucketName,
                        Acl : "public-read",
//                        MetaData : {
//                            'Cache-Control': 'max-age=1209600' // 2 weeks
//                        },
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
                            inspect(err, "Error during upload of file " + item.ObjectName + " length = " + item.ContentLength);
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

                    // clean up temporary minified JS files
                    tempFiles.forEach(function(file) {
                        console.log('Removing temporary file ' + file);
                       fs.unlinkSync(file);
                    });

                    callback(err, (err === null));
            });
        }
    },
    getCloudFrontDistributionConfig: function(callback) {
        cfClient.getDistributionConfig(distributionId, function(err, data) {
            if (err) {
                console.log("Error loading distribution config");
            }
            else {
                distributionConfig = data;
                inspect(distributionConfig, "Distribution config");
            }
            callback(err, (err === null));
        });
    },
    updateCloudFrontDistributionConfig: function(callback) {
        distributionConfig.origins[0].domainName = s3BucketName + ".s3.amazonaws.com";
        cfClient.setDistributionConfig(distributionId, distributionConfig, distributionConfig.etag, function (err, data) {
            if (err) {
                console.log("Error setting distribution config");
            }
            else {
                inspect(data, "Successfully updated distribution config");
            }
            callback(err, (err === null));
        });
    },
    invalidateFiles: function(callback) {
        inspect(uploadedFiles, "Files to invalidate");

        var filesToInvalidate = [];
        uploadedFiles.forEach(function(file) {
            filesToInvalidate.push("/" + file);
        });

        cfClient.createInvalidation(distributionId, today.getTime().toString(), filesToInvalidate, function(err, result){
            if (err) {
                console.log("Failed to invalidate files");
            }
            else {
                inspect(result, "Invalidation was successful");
                invalidationId = result.id;
            }

            callback(err, (err === null));
        })
    },
    waitForUpdatesCompletion: function(callback) {
        var distributionDeployed = false;
        var invalidationCompleted = false;
        var statusError = null;

        if (invalidationId === "") {
            console.log("Internal error - cannot track progress");
            callback(null, false);
            return;
        }
        console.log("Distribution config changes and invalidation requests are in progress - waiting (progress every 5 sec)");

        async.whilst(
            function () {
                return (!statusError && (!distributionDeployed || !invalidationCompleted));
            },
            function (callbackStatus) {
                setTimeout(function() {
                    if (!distributionDeployed) {
                        cfClient.getDistribution(distributionId, function(err, data) {
                            if (err) {
                                statusError = err;
                                console.log("Failed to get distribution status");
                            }
                            else {
                                if (data.status == "Deployed") {
                                    distributionDeployed = true;
                                    console.log("Distribution update is completed!");
                                }
                                else {
                                    process.stdout.write(".");
                                }
                            }
                        });
                    }

                    if (!invalidationCompleted) {
                        cfClient.getInvalidation(distributionId, invalidationId, function(err, data) {
                            if (err) {
                                statusError = err;
                                console.log("Failed to get invalidation status");
                            }
                            else {
                                if (data.status == "Completed") {
                                    invalidationCompleted = true;
                                    console.log("Invalidation of files is completed!");
                                }
                                else {
                                    process.stdout.write(".");
                                }
                            }
                        });
                    }

                    callbackStatus(statusError);
                }, 5000);
            },
            function (err) {
                callback(statusError, (statusError === null));
            }
        );
    }
},
function(err, results) {
    if (err) {
        inspect(err);
    }
});
