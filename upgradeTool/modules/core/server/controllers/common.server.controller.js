'use strict';

var querystring = require('querystring');
var mongoose = require('mongoose');
var _ = require('lodash');
var mongoMask = require('mongo-mask');
var errorHandler = require('../../server/controllers/errors.server.controller');
var validatorHandler = require('../../server/controllers/validators.server.controller');
var ContactInfo = require('../../../contactInfo/server/models/contactInfo.server.model.js').Schema;
var User = require('../../../users/server/models/user.server.model.js').Schema;
var Tool = require('../../../tools/server/models/tools.server.model').Schema;
var helperHandler = require('../../server/controllers/helpers.server.controller');

module.exports = function (Model, dependentModelsDetails, sortOrder) {
  var module = {};
  var modelName = Model.modelName;
  var refactoredEmailStartHtml = helperHandler.getRefactoredEmailStartHtml();
  var refactoredPostHeaderHtml = helperHandler.getRefactoredPostHeaderHtml();
  var refactoredBeforeChangeHtml = helperHandler.getRefactoredBeforeChangeHtml();
  var refactoredEndEmailHtml = helperHandler.getRefactoredEndEmailHtml();
  var refactoredBeforeSmHtml = helperHandler.getRefactoredBeforeSmHtml();
  var refactoredChangeHtml = helperHandler.getRefactoredChangeHtml();
  var refactoredAfterChangeHtml = helperHandler.getRefactoredAfterChangeHtml();

  // CRUD operations on objects; it is necessary for logging info.

  module.create = async function (req, res) {
    try {
      var modelInstance = new Model(req.body);
      await modelInstance.save();
      res.location(`/api/${modelName}s/${modelInstance._id}`).status(201).json(modelInstance);
    } catch (err) {
      var statusCode = (err.name === 'ValidationError' || err.name === 'StrictModeError') ? 400 : 422;
      return res.status(statusCode).send({ message: errorHandler.getErrorMessage(err) });
    }
  };

  module.delete = async function (req, res) {
    var modelInstance = req[modelName];
    var dependentInstancesPromises = [];
    var dependentModelNames = [];

    try {
      for (var i = 0; i < dependentModelsDetails.length; i += 1) {
        var dependentModelDetails = dependentModelsDetails[i];
        var dependentModelKey = dependentModelDetails.modelKey;
        var dependentModelName = dependentModelDetails.modelObject.modelName;
        var DependentModel = dependentModelDetails.modelObject;
        dependentModelNames.push(dependentModelName.toLowerCase());
        var findObject = {};
        findObject[dependentModelKey] = modelInstance._id;
        dependentInstancesPromises.push(DependentModel.find(findObject).exec());
      }
      var dependentInstances = await Promise.all(dependentInstancesPromises);
      for (var x = 0; x < dependentInstances.length; x += 1) {
        if (dependentInstances[x].length > 0) {
          return res.status(422).send({
            message: `Can't delete ${modelName}, it has ${dependentInstances[x].length} dependent ${dependentModelNames[x]}(s).`
          });
        }
      }
      await modelInstance.remove();
      res.json(modelInstance);
    } catch (err) {
      return res.status(422).send({
        message: errorHandler.getErrorMessage(err)
      });
    }
  };

  module.list = async function (req, res) {
    var query;
    if (!validatorHandler.isValidSearch(req.query)) {
      return res.status(422).send({
        message: 'Improperly structured query. Make sure to use ?q=<key>=<value> syntax'
      });
    }

    if (req.query.q) {
      query = querystring.parse(req.query.q);
    }

    var fields;
    if (req.query.fields) {
      fields = mongoMask(req.query.fields, {});
    } else {
      fields = null;
    }

    Model.find(query).select(fields).sort(sortOrder).exec(async function (err, modelInstances) {
      if (err) {
        return res.status(422).send({
          message: errorHandler.getErrorMessage(err)
        });
      }
      res.json(modelInstances);
    });
  };

  module.upgradeCheck = async function (req, res) {
    var query;
    if (!validatorHandler.isValidSearch(req.query)) {
      return res.status(422).send({
        message: 'Improperly structured query. Make sure to use ?q=<key>=<value> syntax'
      });
    }

    if (req.query.q) query = querystring.parse(req.query.q);
    var supportContacts = await ContactInfo.findOne();
    var sm = await User.findById(supportContacts.scrumMaster);
    var po = await User.findById(supportContacts.productOwner);
    var fields = (req.query.fields) ? mongoMask(req.query.fields, {}) : null;
    Model.find(query).select(fields).sort(sortOrder).exec(async function (err, modelInstances) {
      if (err) {
        return res.status(422).send({
          message: errorHandler.getErrorMessage(err)
        });
      }
      var toolUpgrades = modelInstances.filter(upgrade => upgrade.plannedUpgradeTime !== undefined);
      if (!toolUpgrades || toolUpgrades.length === 0) res.status(200).send({ message: 'No Upgrade scheduled' });

      var latestUpgrade = toolUpgrades.reduce(function (a, b) { return a.plannedUpgradeTime > b.plannedUpgradeTime ? a : b; });

      // refactoring latests upgrade email for tool footers.
      var latestUpgradeRefactored = {
        plannedUpgradeTime: latestUpgrade.plannedUpgradeTime,
        subject: latestUpgrade.plannedEmail.subject
      };
      var header = latestUpgrade.plannedEmail.content.split('<body')[1].split('</body>')[0].split('<h2 style="text-align:center">')[1].split('</h2>')[0];
      var commitsHtml = '';
      latestUpgrade.plannedEmail.commits.forEach(commit => {
        if (commit.issues.length > 0) {
          commit.issues.forEach(issue => {
            var jiraUrl = `https://${process.env.JIRA_HOST}/browse/${issue.issue}`;
            commitsHtml = commitsHtml.concat(`<li><strong>[<a href="${jiraUrl}">${issue.issue}</a>]</strong> ${issue.issueSummary}`);
            if (issue.comment) commitsHtml = commitsHtml.concat(`<br>&nbsp;&nbsp;<strong>Note:</strong> ${issue.comment}`);
          });
        } else {
          commitsHtml = commitsHtml.concat(`<li>${commit.commitMessage}`);
          if (commit.comment) commitsHtml = commitsHtml.concat(`<br>&nbsp;&nbsp;<strong>Note:</strong> ${commit.comment}`);
        }
        commitsHtml = commitsHtml.concat('</li>');
      });
      var foundTool = await Tool.findOne({ name: query.toolName });
      var changeLogsHtml = '';
      var changeLogUrl;
      if (foundTool.name.startsWith('oqs-')) {
        var allOqsRepos = await Tool.find({ name: /.*oqs-.*/ });
        allOqsRepos.forEach(repo => {
          changeLogsHtml = changeLogsHtml.concat(`${refactoredChangeHtml}${repo.changeLogUrl}">${repo.toolEmailName}${refactoredAfterChangeHtml}`);
        });
      } else {
        changeLogUrl = foundTool.changeLogUrl;
        changeLogsHtml = `${refactoredChangeHtml}${changeLogUrl}">${foundTool.toolEmailName}${refactoredAfterChangeHtml}`;
      }

      var upgradeTime = new Date(latestUpgrade.plannedUpgradeTime);
      var supportContactString = `${sm.displayName}
        </strong> ${sm.email} <br><strong>PO: ${po.displayName}
        </strong> ${po.email} <br><strong>Team: ${supportContacts.team}
        </strong> ${supportContacts.teamEmail} <br>`;

      latestUpgradeRefactored.refactoredUpgradeEmail = `${refactoredEmailStartHtml}${header}${refactoredPostHeaderHtml}
        ${commitsHtml}${refactoredBeforeChangeHtml}${changeLogsHtml}${refactoredBeforeSmHtml}
        ${supportContactString}${refactoredEndEmailHtml}`;

      latestUpgradeRefactored.refactoredUpgradeEmail = latestUpgradeRefactored.refactoredUpgradeEmail.replace(/\n/g, '');

      if (upgradeTime > new Date()) {
        res.json(latestUpgradeRefactored);
      } else {
        return res.status(200).send({
          message: 'No Upgrade scheduled'
        });
      }
    });
  };


  module.read = function (req, res) {
    var modelInstance = req[modelName] ? req[modelName].toJSON() : {};
    res.json(modelInstance);
  };

  async function doesUserHavePermissionsToUpdateTeam(admins, userId) {
    if (!admins.includes(userId.toString())) {
      throw new Error('Cannot update as user is not admin of this team.');
    }
  }

  module.update = async function (req, res) {
    try {
      if (Model.modelName === 'Team' && req.user.roles[0] !== 'superAdmin') {
        await doesUserHavePermissionsToUpdateTeam(req.body.admin_IDs, req.user._id);
      }
      var modelInstance = _.extend(req[modelName], req.body);
      await modelInstance.save();
      return res.json(modelInstance);
    } catch (err) {
      var statusCode = (err.name === 'ValidationError' || err.name === 'StrictModeError') ? 400 : 422;
      return res.status(statusCode).send({ message: errorHandler.getErrorMessage(err) });
    }
  };

  module.findById = function (req, res, next, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).send({
        message: `A ${modelName} with that id does not exist`
      });
    }
    var fields;
    if (req.query.fields) {
      fields = mongoMask(req.query.fields, {});
    } else {
      fields = null;
    }
    Model.findById(id).select(fields).exec(function (err, modelInstance) {
      if (err) {
        return next(err);
      }
      if (!modelInstance) {
        return res.status(404).send({
          message: `A ${modelName} with that id does not exist`
        });
      }
      req[modelName] = modelInstance;
      return next();
    });
  };

  return module;
};
