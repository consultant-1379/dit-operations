'use strict';

var tools = require('../controllers/tools.server.controller');
var adminPolicy = require('../../../../config/lib/policy');

module.exports = function (app) {
  app.route('/api/tools')
    .get(adminPolicy.isAllowed, tools.list)
    .post(adminPolicy.isAllowed, tools.create);

  app.route('/api/tools/:toolId')
    .get(adminPolicy.isAllowed, tools.read)
    .put(adminPolicy.isAllowed, tools.update)
    .delete(adminPolicy.isAllowed, tools.delete);

  app.param('toolId', tools.findById);
};
