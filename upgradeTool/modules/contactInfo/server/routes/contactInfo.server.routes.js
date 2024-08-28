'use strict';

var contactInfo = require('../controllers/contactInfo.server.controller');
var adminPolicy = require('../../../../config/lib/policy');

module.exports = function (app) {
  app.route('/api/contactInfo')
    .get(adminPolicy.isAllowed, contactInfo.list)
    .post(adminPolicy.isAllowed, contactInfo.create);

  app.route('/api/contactInfo/:contactInfoId')
    .get(adminPolicy.isAllowed, contactInfo.read)
    .put(adminPolicy.isAllowed, contactInfo.update)
    .delete(adminPolicy.isAllowed, contactInfo.delete);

  app.param('contactInfoId', contactInfo.findById);
};
