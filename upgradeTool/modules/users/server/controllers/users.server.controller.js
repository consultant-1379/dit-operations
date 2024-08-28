'use strict';

var mongoose = require('mongoose'),
  _ = require('lodash'),
  User = mongoose.model('User'),
  errorHandler = require('../../../../modules/core/server/controllers/errors.server.controller'),
  ldap = require('../../../../config/lib/ldap'),
  commonController = require('../../../core/server/controllers/common.server.controller'),
  toolsTeamUsernames = ['eavrbra', 'eeijtar', 'ejamfur', 'emciccm', 'eistpav', 'dttadm100', 'egilcao', 'emaalbd', 'ewilwre', 'ednhoar', 'eaxinta', 'eponnay', 'edasric', 'eartjij', 'earujos'];
var dependentModelsDetails = [];
var sortOrder = 'name';
commonController = commonController(User, dependentModelsDetails, sortOrder);

exports.findById = commonController.findById;

exports.read = function (req, res) {
  var modelInstance = req.User ? req.User.toJSON() : {};
  var strippedModelInstance = {
    displayName: modelInstance.displayName,
    username: modelInstance.username
  };
  res.json(strippedModelInstance);
};

exports.list = async function (req, res) {
  try {
    var users = await User.find({}, '-salt -password -providerData').sort('-created').populate('user', 'displayName').exec();
    res.json(users);
  } catch (err) {
    return res.status(422).send({
      message: errorHandler.getErrorMessage(err)
    });
  }
};

exports.signin = async function (req, res) {
  try {
    var user = await ldap.signinFromLoginPage(req, res);
    if (!toolsTeamUsernames.includes(user.username)) {
      throw new Error('You have to be a Tools Team member to use this tool');
    }
    user.password = undefined;
    user.salt = undefined;
    res.json(user);
  } catch (err) {
    return res.status(422).send({
      message: errorHandler.getErrorMessage(err)
    });
  }
};

exports.signout = function (req, res) {
  req.logout();
  res.redirect('/authentication/signin');
};
