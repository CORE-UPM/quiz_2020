"use strict";

const crypto = require('crypto');

// Create an user access token for the routes mounted at /api.
exports.createToken = () => {

    const salt = Math.round((new Date().valueOf() * Math.random())) + '';
    return crypto.createHmac('sha256', salt).update("UserQuizToken").digest('hex').substring(10,30);

};
