const cloudinary = require('cloudinary');
const fs = require('fs');
var path = require('path');
var crypto = require('crypto');


/**
 * Create a promise to upload a new file to Cloudinary.
 *
 * If the file can be uploaded then the promise is satisfied and returns the public_id and
 * the url of the uploaded resource.
 * If the file can not be uploaded, the promise is rejected.
 *
 * The file can be uploaded to: Cloudinary, or to to local file system.
 *   - Cloudinary - If there exists the CLOUDINARY_URL environment variable.
 *   - Local file system - If there does not exist the CLOUDINARY_URL environment variable.
 *                         The file is saved into the public/uploads directory
 *
 * @return Returns a Promise.
 */
exports.uploadResource = function (src, options) {

    return new Promise(function (resolve, reject) {

        if (!!process.env.CLOUDINARY_URL) {

            resolve(uploadResourceToCloudinary(src, options));

        } else {

            resolve(uploadResourceToFileSystem(src, options));

        }
    });
};


/**
 * Create a promise to upload a new file to Cloudinary.
 *
 * If the file can be uploaded then the promise is satisfied and returns the public_id and
 * the url of the uploaded resource.
 * If the file can not be uploaded, the promise is rejected.
 *
 * @return Returns a Promise.
 */
const uploadResourceToCloudinary = (src, options) => {

    return new Promise(function (resolve, reject) {

        cloudinary.v2.uploader.upload(
            src,
            options,
            function (error, result) {
                if (!error) {
                    resolve({public_id: result.public_id, url: result.secure_url});
                } else {
                    reject(error);
                }
            }
        );
    });
};


/**
 * Create a promise to upload a new file to the local file system.
 *
 * If the file can be uploaded then the promise is satisfied and returns the public_id and
 * the url of the uploaded resource.
 * If the file can not be uploaded, the promise is rejected.
 *
 * @return Returns a Promise.
 */
const uploadResourceToFileSystem = (src, options) => {

    return new Promise(function (resolve, reject) {

        const salt = Math.round((new Date().valueOf() * Math.random())) + '';
        const public_id = crypto.createHmac('sha256', salt).update(src).digest('hex');

        const urlPrefix = options.urlPrefix || "";
        const url = urlPrefix + path.join("/uploads", public_id);

        const destination = path.join("public", "uploads", public_id);

        fs.copyFile(src, destination, fs.constants.COPYFILE_EXCL, function (error) {

            if (error) {
                reject(error);
            } else {
                resolve({
                    public_id: public_id,
                    url: url
                });
            }
        });
    });
};


/**
 * Deletes a saved file.
 *
 *  If there exists the CLOUDINARY_URL environment variable, the file is deleted from cloudinaty.
 *
 *  If there does not exist the CLOUDINARY_URL environment variable, the file is deleted from
 *  the local file system.
 */
exports.deleteResource = function (public_id) {

    if (!!process.env.CLOUDINARY_URL) {

        // Delete from Cloudinary.
        cloudinary.api.delete_resources(public_id);

    } else {

        const destination = path.join("public", "uploads", public_id);

        // Delete from local file system.
        fs.unlink(destination, function (error) {
            console.log("Error deleting attachment file from local file system:", error);
        });
    }
};


/**
 * Returns the URL of the image with the given public_id.
 *
 * @param public_id Identifies the image.
 * @param options   Options to build the  URL:
 * @returns {string} The URL of the image.
 */
exports.image = function (public_id, options) {

    if (!!process.env.CLOUDINARY_URL) {

        return cloudinary.image(public_id, options);

    } else {

        const src = path.join("/uploads", public_id);
        const width = options.width || "";

        return "<img src='" + src + "' width='" + width + "' >"
    }
};


/**
 * Returns the URL of the mp4 video with the given public_id.
 *
 * @param public_id Identifies the video.
 * @param options   Options to build the  URL:
 * @returns {string} The URL of the video.
 */
exports.video = function (public_id, options) {

    if (!!process.env.CLOUDINARY_URL) {

        return cloudinary.video(public_id, options);

    } else {

        const src = path.join("/uploads", public_id);
        const width = options.width || "";
        const controls = !!options.controls ? "controls" : "";

        return "<video width='" + width + "' " + controls + " >" +
            "   <source src='" + src + "' type='video/mp4' >" +
            "</video>"
    }
};
