'use strict';

var acl = require('acl');
var mongoose = require('mongoose');
var User = mongoose.model('User');

acl = new acl(new acl.memoryBackend());

exports.invokeRolesPolicies = function () {
  acl.allow([
    {
      roles: ['user'],
      allows: [{
        resources: '/api/logs',
        permissions: '*'
      }, {
        resources: '/api/logs/:logId',
        permissions: '*'
      }]
    },
    {
      roles: ['admin'],
      allows: [{
        resources: '/api/logs',
        permissions: '*'
      }, {
        resources: '/api/logs/:logId',
        permissions: '*'
      }]
    },
    {
      roles: ['superAdmin'],
      allows: [{
        resources: '/api/logs',
        permissions: '*'
      }, {
        resources: '/api/logs/:logId',
        permissions: '*'
      }]
    }
  ]);
};

exports.isAllowed = async function (req, res, next) {
  /* production check to be removed during phase 2 */
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
    return next();
  }
  var user = await getUserFromID(req.session.passport.user);
  acl.areAnyRolesAllowed(user.roles, req.route.path, req.method.toLowerCase(), function (err, isAllowed) {
    if (err) {
      return res.status(500).send('Unexpected authorization error');
    }
    if (isAllowed) {
      return next();
    }
    return res.status(403).json({
      message: 'User is not authorized'
    });
  });
};

async function getUserFromID(userID) {
  return User.findById(userID, '-salt -password -providerData').exec();
}
