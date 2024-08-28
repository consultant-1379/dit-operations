'use strict';

var logs = require('../controllers/upgradeLogs.server.controller');
var adminPolicy = require('../../../../config/lib/policy');

module.exports = function (app) {
  app.route('/api/logs')
    .get(logs.list)
    .post(adminPolicy.isAllowed, logs.create);

  app.route('/api/logs/:logId')
    .get(logs.read)
    .delete(logs.delete);

  app.route('/api/upgradeCheck')
    .get(logs.upgradeCheck);

  app.param('logId', logs.findById);
};
