'use strict';

var Log = require('../models/upgradeLogs.server.model').Schema;
var commonController = require('../../../core/server/controllers/common.server.controller');
var errorHandler = require('../../../core/server/controllers/errors.server.controller');

var dependentModelsDetails = [];
var sortOrder = 'name';
commonController = commonController(Log, dependentModelsDetails, sortOrder);

exports.read = commonController.read;
exports.list = commonController.list;
exports.delete = commonController.delete;
exports.upgradeCheck = commonController.upgradeCheck;
exports.findById = commonController.findById;


exports.create = async function (req, res) {
  try {
    commonController.setLoggedInUser(req.user);
    var log = new Log(req.body);
    await log.validate();
    await log.save();
    res.location(`/api/logs/${log._id}`).status(201).json(log);
  } catch (err) {
    var statusCode = (err.name === 'ValidationError' || err.name === 'StrictModeError') ? 400 : 422;
    return res.status(statusCode).send({
      message: errorHandler.getErrorMessage(err)
    });
  }
};
