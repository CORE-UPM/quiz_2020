const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


/**
 * Create a promise to upload a new file.
 *
 * If the file can be uploaded then the promise is satisfied and returns the resource and
 * the url of the uploaded resource.
 * If the file can not be uploaded, the promise is rejected.
 *
 * The file to upload is req.file.path
 *
 * @return Returns a Promise.
 */
exports.uploadResource = req => {
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

    const destination = path.join("public", "uploads", resource);

    // Delete from local file system.
    fs.unlink(destination, function (error) {
        console.log("Error deleting attachment file from local file system:", error);
    });
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
