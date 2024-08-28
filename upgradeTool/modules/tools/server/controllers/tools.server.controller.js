'use strict';

var _ = require('lodash');
var moment = require('moment');
var Tool = require('../models/tools.server.model').Schema;
var Log = require('../../../upgradeLogs/server/models/upgradeLogs.server.model').Schema;
var commonController = require('../../../core/server/controllers/common.server.controller');
var coreController = require('../../../core/server/controllers/core.server.controller');
var errorHandler = require('../../../core/server/controllers/errors.server.controller');

var dependentModelsDetails = [];
var sortOrder = 'name';
commonController = commonController(Tool, dependentModelsDetails, sortOrder);

exports.create = commonController.create;
exports.read = commonController.read;
exports.list = commonController.list;
exports.findById = commonController.findById;
exports.delete = commonController.delete;

exports.update = async function (req, res) {
  try {
    var currentTime = moment();
    if (!req.body.notificationEnabled && !req.body.notificationStart && !req.body.notificationEnd &&
      req.body.notifications && !req.body.autoRemoveNotification) {
      req.body.autoRemoveNotification = moment().add(48, 'hours');
    }
    var error = '';
    if (req.body.notificationStart && !req.body.notificationEnd) { error += 'Please enter Notification End Date\n'; }
    if (!req.body.notificationStart && req.body.notificationEnd) { error += 'Please enter Notification Start Date\n'; }
    if (moment(req.body.notificationStart).isBefore(currentTime)) {
      error += 'Notification start Date cannot be in the past\n';
    }
    if (moment(req.body.notificationEnd).isBefore(moment(req.body.notificationStart))) {
      error += 'Notification end Date cannot be ahead of notification Start Date';
    }
    if (error !== '') { return res.status(400).send({ message: error }); }
    var originalTool = await Tool.findById(req.Tool._id).exec();
    var tool = _.extend(req.Tool, req.body);
    var sendCiEmail;
    var toolLogs = await Log.find({ toolName: tool.name });
    if (originalTool.ci !== tool.ci) {
      tool.needsToBeUpgraded = false;
      tool.plannedUpgradeEmailSent = false;
      if (toolLogs.length !== 0) {
        var latestLog = toolLogs[toolLogs.length - 1];
        if (latestLog.plannedEmail.sentDate && !latestLog.completedEmail.sentDate) {
          if (tool.ci) tool.needsToBeUpgraded = true;
          tool.plannedUpgradeEmailSent = true;
        }
      }
      sendCiEmail = true;
    }
    await tool.save();
    if (sendCiEmail) {
      await coreController.ciEmail(req.user.username, tool.name, tool.ci);
    }
    return res.json(tool);
  } catch (err) {
    var statusCode = (err.name === 'ValidationError' || err.name === 'StrictModeError') ? 400 : 422;
    return res.status(statusCode).send({
      message: `Error when updating Tool: ${errorHandler.getErrorMessage(err)}`
    });
  }
};
