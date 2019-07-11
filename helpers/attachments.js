const cloudinary = require('cloudinary');
const fs = require('fs');


// Options for the files uploaded to Cloudinary
const cloudinary_upload_options = {
    async: false,
    folder: "/core/quiz2020/attachments",
    resource_type: "auto",
    tags: ['core', 'quiz2020']
};

/**
 * Create a promise to upload a new file to Cloudinary.
 *
 * If the file can be uploaded then the promise is satisfied and returns the public_id and
 * the url of the uploaded resource.
 * If the file can not be uploaded, the promise is rejected.
 *
 * The file to upload es req.file.path
 *
 * @return Returns a Promise.
 */
exports.uploadResourceToCloudinary = req => {

    return new Promise((resolve, reject) => {

        cloudinary.v2.uploader.upload(
            req.file.path,
            cloudinary_upload_options,
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
 * Delete a resource from Cloudinary
 */
exports.deleteResource = public_id => {
    cloudinary.api.delete_resources(public_id);
};


/**
 * Checks if the CLOUDINAY_URL environmnet variable exists.
 *
 * Returns false if it does not exist.
 */
exports.checksCloudinaryEnv = () => {

    if (!process.env.CLOUDINARY_URL) {
        console.log("Error: CLOUDINARY_URL environment variable is not defined.");
        return false;
    }
    return true;
};


/**
 * Returns HTML img element for the given URL.
 *
 * @param url         URL of the image.
 * @returns {string}  String with the <img> element.
 */
exports.image = url => {

    exports.checksCloudinaryEnv();

    return `<img class="attachment" src="${url}" alt="Image">`;
};


/**
 * Returns HTML video element for the given URL.
 *
 * @param url         URL of the video.
 * @returns {string}  String with the <video> element.
 */
exports.video =  url => {

    exports.checksCloudinaryEnv();

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

