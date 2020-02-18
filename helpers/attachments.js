const cloudinary = require('cloudinary');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


// Options for the files uploaded to Cloudinary
const cloudinary_upload_options = {
    async: false,
    folder: "/core/quiz2020/attachments",
    resource_type: "auto",
    tags: ['core', 'iweb', 'cdps', 'quiz2020']
};


/**
 * Create a promise to upload a new file.
 *
 * If the file can be uploaded then the promise is satisfied and returns the resource and
 * the url of the uploaded resource.
 * If the file can not be uploaded, the promise is rejected.
 *
 *  The file can be uploaded to: Cloudinary, or to the local file system.
 *   - Cloudinary - If there exists the CLOUDINARY_URL environment variable.
 *   - Local file system - If there does not exist the CLOUDINARY_URL environment variable.
 *                         The file is saved into the public/uploads directory
 *
 * The file to upload is req.file.path
 *
 * @return Returns a Promise.
 */
exports.uploadResource = req => {

    return new Promise(function (resolve, reject) {
        if (!!process.env.CLOUDINARY_URL) {
            resolve(uploadResourceToCloudinary(req));
        } else {
            resolve(uploadResourceToFileSystem(req));
        }
    });
};


/**
 * Create a promise to upload a new file to Cloudinary.
 *
 * If the file can be uploaded then the promise is satisfied and returns the resource (public_id) and
 * the url of the uploaded resource.
 * If the file can not be uploaded, the promise is rejected.
 *
 * The file to upload is req.file.path
 *
 * @return Returns a Promise.
 */
const uploadResourceToCloudinary = req => {

    return new Promise((resolve, reject) => {

        cloudinary.v2.uploader.upload(
            req.file.path,
            cloudinary_upload_options,
            (error, result) => {
                if (!error) {
                    resolve({resource: result.public_id, url: result.secure_url});
                } else {
                    reject(error);
                }
            }
        );
    })
};


/**
 * Create a promise to upload a new file to the local file system.
 *
 * If the file can be uploaded then the promise is satisfied and returns the resource and
 * the url of the uploaded resource.
 * If the file can not be uploaded, the promise is rejected.
 *
 * @return Returns a Promise.
 */
const uploadResourceToFileSystem = req => {

    return new Promise(function (resolve, reject) {

        const salt = Math.round((new Date().valueOf() * Math.random())) + '';
        const resource = crypto.createHmac('sha256', salt).update(req.file.path).digest('hex');

        const urlPrefix = req.protocol + "://" + req.headers.host;
        const url = urlPrefix + path.join("/uploads", resource);

        const destination = path.join("public", "uploads", resource);

        fs.copyFile(req.file.path, destination, fs.constants.COPYFILE_EXCL, function (error) {

            if (error) {
                reject(error);
            } else {
                resolve({
                    resource,
                    url
                });
            }
        });
    });
};




/**
 * Deletes a saved file.
 */
exports.deleteResource = resource => {

    if (!!process.env.CLOUDINARY_URL) {
        // Delete from Cloudinary.
        cloudinary.api.delete_resources(resource);
    } else {
        const destination = path.join("public", "uploads", resource);

        // Delete from local file system.
        fs.unlink(destination, function (error) {
            console.log("Error deleting attachment file from local file system:", error);
        });
    }
};


/**
 * Returns HTML img element for the given URL.
 *
 * @param url         URL of the image.
 * @returns {string}  String with the <img> element.
 */
exports.image = url => {

    return `<img class="attachment" src="${url}" alt="Image">`;
};


/**
 * Returns HTML video element for the given URL.
 *
 * @param url         URL of the video.
 * @returns {string}  String with the <video> element.
 */
exports.video =  url => {

    return `<video class="attachment" alt="Video"><source src="${url}" type="video/mp4"></video>`;
};

/**
 * Delete a file in the local file system.
 *
 * @param path Path to the file to delete.
 */
exports.deleteLocalFile = path => {
    fs.unlink(path, err => {
        if (err) {
            console.log(`Error deleting file: ${path} >> ${err}`);
        }
    });
};
