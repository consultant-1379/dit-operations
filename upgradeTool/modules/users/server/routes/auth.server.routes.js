'use strict';

var users = require('../controllers/users.server.controller');

module.exports = function (app) {
  // Setting up the users authentication api
  app.route('/api/auth/signin').post(users.signin);
  app.route('/api/auth/signout').get(users.signout);
  app.route('/api/users').get(users.list);
  app.route('/api/users/:userId').get(users.read);
  app.param('userId', users.findById);
};
