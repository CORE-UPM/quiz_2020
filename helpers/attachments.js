const cloudinary = require('cloudinary');
const fs = require('fs');

/**
 * Create a promise to upload a new file to Cloudinary.
 *
 * If the file can be uploaded then the promise is satisfied and returns the public_id and
 * the url of the uploaded resource.
 * If the file can not be uploaded, the promise is rejected.
 *
 * @return Returns a Promise.
 */
exports.uploadResourceToCloudinary = (path, options) => {

    return new Promise((resolve, reject) => {

        cloudinary.v2.uploader.upload(
            path,
            options,
            (error, result) => {
                if (!error) {
                    resolve({public_id: result.public_id, url: result.secure_url});
                } else {
                    reject(error);
                }
            }
        );
    })
};


/**
 * Checks that the CLOUDINAY_URL environmnet variable exists.
 *
 * Returns a Promise.
 */
exports.checksCloudinaryEnv = () => {

    return new Promise((resolve, reject) => {
        if (!!process.env.CLOUDINARY_URL) {
            resolve();
        } else {
            reject(new Error("Environment variable CLOUDINARY_URL is not defined."));
        }
    });
};
