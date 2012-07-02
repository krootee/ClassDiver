var inspect = require('eyes').inspector(),
    awssum = require('awssum'),
    amazon = awssum.load('amazon/amazon'),
    S3 = awssum.load('amazon/s3').S3;

var accessKeyId = "AKIAJDPNLVY6FJSOTFHA";
var secretAccessKey = "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";

var myS3Bucket = new S3({
    'accessKeyId' : accessKeyId,
    'secretAccessKey' : secretAccessKey,
    'region' : amazon.US_EAST_1
});

console.log('Region :', myS3Bucket.region());
console.log('EndPoint :',  myS3Bucket.host());
console.log('AccessKeyId :', myS3Bucket.accessKeyId());

var today = new Date();
var s3BucketName = "www.classdiver.com-" + today.getUTCFullYear() + "." + (today.getUTCMonth() + 1) + "." + today.getUTCDate() +
    "T" + today.getUTCHours() + "." + today.getUTCMinutes() + "." + today.getUTCSeconds();
//var s3BucketName = "www.classdiver.com-1235999432";

    myS3Bucket.CreateBucket({ BucketName : s3BucketName }, function(err, data) {
    if (err) {
        console.log("\n Problem with creation bucket '" + s3BucketName + "'.");
        inspect(err, 'Error');
        return;
    }

    console.log("\nBucket " + data.Headers.location + " created successfully.");
    inspect(data, 'Data');
});
