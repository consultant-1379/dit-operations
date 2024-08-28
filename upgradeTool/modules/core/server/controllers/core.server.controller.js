'use strict';

var fs = require('fs'),
  { exec } = require('child_process'),
  util = require('util'),
  execPromise = util.promisify(require('child_process').exec),
  moment = require('moment'),
  momentTimeZone = require('moment-timezone'),
  semver = require('semver'),
  validator = require('validator'),
  nodeSchedule = require('node-schedule'),
  log4js = require('log4js'),
  logger = log4js.getLogger(),
  _ = require('lodash'),
  express = require('express'),
  bodyParser = require('body-parser'),
  requestPromise = require('request-promise'),
  config = require('../../../../config/config'),
  helperHandler = require('../../server/controllers/helpers.server.controller'),
  app = express(),
  User = require('../../../users/server/models/user.server.model').Schema,
  Log = require('../../../upgradeLogs/server/models/upgradeLogs.server.model').Schema,
  Tool = require('../../../tools/server/models/tools.server.model').Schema,
  ContactInfo = require('../../../contactInfo/server/models/contactInfo.server.model').Schema,
  errorHandler = require('../../server/controllers/errors.server.controller');
app.use(express.static('public'));
app.use(express.static('views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
logger.level = 'debug';
var toolUpgrading;
var userUpgrading;
var upgradeStartTime;
var upgradeFromVersion;
var upgradeFromVersionObject;
var upgradeToVersion;
var upgradeToVersionObject;
var isOQS;
var logObject = {};
var upgradeToolEmail = `"Tools Team Upgrade Tool" <${process.env.UPGRADE_TOOL_EMAIL_ADDRESS}>`;
var emailCss = helperHandler.getEmailCss();
var htmlAfterEmailHeader = helperHandler.getHtmlAfterEmailHeader();
var htmlBeforeEmailCommits = helperHandler.getHtmlBeforeEmailCommits();
// eslint-disable-next-line quotes
var updatesEnd = `<span style='font-family:"Ericsson Hilda"'><o:p></o:p></span></b></p>`;
// eslint-disable-next-line quotes
var minifySpanStart = `<p class="MsoNormal"><b><span style='font-family:"Ericsson Hilda";color:#000'>`;
var emailEndHtml = helperHandler.getEmailEndHtml();
var emailAttachment = [
  {
    filename: 'ericsson-footer-logo.png',
    path: './modules/core/client/img/ericsson-footer-logo.png',
    cid: 'unique@ericsson.com'
  },
  {
    filename: 'de-operations-update.png',
    path: './modules/core/client/img/de-operations-update.png',
    cid: 'uniqueTwo@ericsson.com'
  }];

/**
 * Render the main application page
 */
exports.renderIndex = function (req, res) {
  var safeUserObject = null;
  if (req.user) {
    safeUserObject = {
      displayName: validator.escape(req.user.displayName),
      username: validator.escape(req.user.username),
      created: req.user.created.toString(),
      roles: req.user.roles,
      email: validator.escape(req.user.email),
      lastName: validator.escape(req.user.lastName),
      firstName: validator.escape(req.user.firstName)
    };
  }

  res.render('modules/core/server/views/index', {
    user: JSON.stringify(safeUserObject),
    sharedConfig: JSON.stringify(config.shared)
  });
};

exports.loginTest = async function (req, res) {
  res.send({ message: 'success' });
};

exports.getVersion = async function (req, res) {
  var version = await readFileAsync('VERSION');
  res.send(version);
};

function readFileAsync(path) {
  return new Promise(function (resolve, reject) {
    fs.readFile(path, 'utf8', function (error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Render the server not found responses
 * Performs content-negotiation on the Accept HTTP header
 */
exports.renderNotFound = function (req, res) {
  res.status(404).format({
    'text/html': function () {
      res.render('modules/core/server/views/404', {
        url: req.originalUrl
      });
    },
    'application/json': function () {
      res.json({
        error: 'Path not found'
      });
    },
    default: function () {
      res.send('Path not found');
    }
  });
};

exports.cloneTools = async function (req, res) {
  try {
    var allTools = await Tool.find();
    var toolsRepos = [];
    await helperHandler.asyncForEach(allTools, async function (tool) {
      toolsRepos.push(tool.repo);
    });
    await execPromise(`./cloneTools.sh ${toolsRepos.toString()} > terminalOutput 2>&1`);
  } catch (err) {
    res.status(422).json({
      message: 'Failed to Clone Tool',
      error: err.message
    });
    return;
  }
  res.status(200).json({ message: 'Cloning Tools Complete!' });
};

exports.getToolNotifications = async function (req, res) {
  try {
    var toolName = req.params.tool;
    var foundTool = await Tool.findOne({ name: toolName });
    res.status(200).send({
      notification: (foundTool.notifications) ? foundTool.notifications : '',
      jira: (foundTool.notificationJira) ? `https://${process.env.JIRA_HOST}/browse/${foundTool.notificationJira}` : '',
      enabled: foundTool.notificationEnabled
    });
  } catch (err) {
    return res.status(422).send({
      message: errorHandler.getErrorMessage(err)
    });
  }
};

exports.getToolInfo = async function (req, res) {
  var toolName = req.params.tool;
  var currentVersion,
    commits,
    mergedVersion,
    mergedVersionSplitOQS,
    toolVersion;
  var foundTool = await Tool.findOne({ name: toolName });
  if (!foundTool) {
    return res.status(422).json({
      message: `Failed to get Info for tool name: ${toolName}`
    });
  }

  try {
    if (toolName.includes('oqs')) {
      var toolSufix = toolName.split('-')[1];
      toolVersion = await requestPromise(`http://${foundTool.toolUrl}/api/core/versions`);
      toolVersion = JSON.parse(toolVersion)[`${toolSufix}`];
      foundTool.currentVersion = toolVersion.trim();
      currentVersion = toolVersion.trim();
      currentVersion = toolName.replace('oqs', 'openstack-queuing-solution');
      currentVersion += `-${toolVersion}`.trim();
    } else {
      toolVersion = await requestPromise(`http://${foundTool.toolUrl}/api/version`);
      foundTool.currentVersion = toolVersion.trim();
      currentVersion = `${toolName}-${toolVersion}`.trim();
    }
    mergedVersion = await execPromise(`cd allTools && cd ${toolName} && git describe`);
    if (toolName.includes('oqs')) {
      mergedVersion = mergedVersion.stdout;
      mergedVersionSplitOQS = mergedVersion.split('-');
      // eslint-disable-next-line max-len
      mergedVersion = `${mergedVersionSplitOQS[0]}-${mergedVersionSplitOQS[1]}-${mergedVersionSplitOQS[2]}-${mergedVersionSplitOQS[3]}-${mergedVersionSplitOQS[4]}`;
      foundTool.mergedVersion = mergedVersionSplitOQS[4];
    } else {
      foundTool.mergedVersion = mergedVersion.stdout.split('-').reverse()[2];
    }

    commits = await getLatestCommits(toolName, currentVersion, 'HEAD');
    await foundTool.save();
  } catch (getToolInfoErr) {
    await fs.writeFileSync('terminalOutput', `Failed to get Tool Info\n${getToolInfoErr}`);
    res.status(422).json({
      message: 'Failed to get Tool Info',
      error: getToolInfoErr
    });
    return;
  }
  // eslint-disable-next-line max-len
  exec(`cd allTools && cd ${toolName} && git log ${currentVersion} --pretty=format:"%h, %>(15,trunc)%aN, %>(15,trunc)%cr, %<(140,trunc)%s" --abbrev-commit`, async function (error, changelog) {
    var allNotReleasedVersions = _.uniq(commits.match(/(\d+\.)(\d+\.)(\d+)/g));
    var allReleasedVersions = _.uniq(changelog.match(/(\d+\.)(\d+\.)(\d+)/g));
    var firstFiveReleasedVersions = allReleasedVersions.slice(0, 5);
    var fifthReleasedVersion = '';
    fifthReleasedVersion = `${(toolName.includes('oqs') ? toolName.replace('oqs', 'openstack-queuing-solution') : toolName)}-${allReleasedVersions[5]}`.trim();
    var previousCommits = await execPromise(getGitLogCommand(toolName, fifthReleasedVersion, currentVersion));
    previousCommits = (previousCommits.stdout.trim()) ? previousCommits.stdout.trim() : 'No Commits Released.';

    var versionsToReturn = allNotReleasedVersions.concat(firstFiveReleasedVersions);
    versionsToReturn = await addVersionMetaData(versionsToReturn, firstFiveReleasedVersions[0]);
    mergedVersion = (toolName.includes('oqs')) ? mergedVersionSplitOQS[4] : mergedVersion.stdout.split('-').reverse()[2];

    var toolInfoJSON = JSON.stringify({
      currentVersion: firstFiveReleasedVersions[0],
      mergedVersion: mergedVersion,
      commits: (commits.replace(/.*ENM_Jenkins.*/, '') || 'All Released'),
      previousCommits: (previousCommits.replace(/.*ENM_Jenkins.*/, '') || 'None Released'),
      otherVer: versionsToReturn,
      recipients: foundTool.recipients,
      ci: foundTool.ci
    });
    await fs.writeFileSync('terminalOutput', 'Tool Info received successfully.');
    res.send(toolInfoJSON);
  });
};

async function getLatestCommits(toolName, currentVersion, upgradeVersion) {
  await execPromise(`cd allTools && cd ${toolName} && git fetch origin && git reset --hard origin/master`);
  var commits = await execPromise(getGitLogCommand(toolName, currentVersion, upgradeVersion));
  commits = (commits.stdout.trim()) ? commits.stdout.trim() : 'All Commits Released.';
  return commits;
}

function getGitLogCommand(toolName, currentVersion, upgradeVersion) {
  // eslint-disable-next-line max-len
  return `cd allTools && cd ${toolName} && echo "$(git log ${currentVersion}..${upgradeVersion} --pretty=format:"%h, %>(15,trunc)%aN, %>(15,trunc)%cr, %<(140,trunc)%s" --abbrev-commit)"`;
}

function addVersionMetaData(versionsToReturn, currentVersion) {
  var currentVersionIndex = versionsToReturn.indexOf(currentVersion);
  for (var i = 0; i < versionsToReturn.length; i += 1) {
    var diff = i - currentVersionIndex;
    var versionInfo = 'n ';
    if (diff > 0) {
      versionInfo += '- ' + (diff);
    } else if (diff < 0) {
      versionInfo += '+ ' + (diff * -1);
    }
    versionsToReturn[i] += ': ' + versionInfo;
  }
  return versionsToReturn;
}

exports.getTerminalOutput = async function (req, res) {
  fs.readFile('terminalOutput', 'utf8', async function (err, data) {
    if (err) throw err;
    if (data.includes('PROCESS FINISHED') && !_.isEmpty(logObject)) {
      if (!isOQS) {
        await updateToolNotificationStatus(toolUpgrading);
        var log = await Log.find({ toolName: toolUpgrading.name, upgradeToVersion: upgradeToVersion }).sort({ $natural: -1 }).limit(1);
        if (log.length) {
          log = log[0];
          await updateUpgradeLog(log, data);
        } else {
          await createUpgradeLog(data);
        }
        var healthcheckPassed = data.includes('Health-check Passed.');
        var upgradeSuccessful = data.includes('upgrade complete.');
        if (!healthcheckPassed || !upgradeSuccessful) {
          await sendToolsTeamWarningEmail(data);
        }
        await updateMongoAfterUpgrade(toolUpgrading);
      } else {
        var oqsVersions = [];
        Object.keys(upgradeToVersionObject).forEach(function (version) {
          if (upgradeToVersionObject[version].trim() !== upgradeFromVersionObject[version].trim()) {
            oqsVersions.push(version);
          }
        });
        await helperHandler.asyncForEach(oqsVersions, async function (version) {
          toolUpgrading.name = `oqs-${version}`;
          var tool = await Tool.findOne({ name: toolUpgrading.name });
          await updateToolNotificationStatus(tool);
          var log = await Log.find({ toolName: toolUpgrading.name, upgradeToVersion: upgradeToVersionObject[version] })
            .sort({ $natural: -1 }).limit(1);
          upgradeFromVersion = upgradeFromVersionObject[version];
          upgradeToVersion = upgradeToVersionObject[version];
          if (log.length) {
            log = log[0];
            await updateUpgradeLog(log, data);
          } else {
            await createUpgradeLog(data);
          }
        });
      }
    }
    res.send(data);
  });
};

async function updateToolNotificationByAutoRemoveDate(tool) {
  try {
    var currentTime = moment();
    if (tool.autoRemoveNotification && moment(currentTime).isAfter(tool.autoRemoveNotification)) {
      tool.notifications = undefined;
      tool.notificationJira = undefined;
      tool.autoRemoveNotification = undefined;
      await tool.save();
      logger.info(`Removed Notification for ${tool.name}`);
    }
  } catch (updateErr) {
    logger.info(`Notification removal failed for ${tool.name}: ${updateErr}`);
  }
}

async function updatetoolNotificationOnDateTime(tool) {
  try {
    var currentTime = moment();
    if (tool.notificationStart && tool.notificationEnd && moment(currentTime).isAfter(tool.notificationStart)) {
      tool.notificationEnabled = moment(currentTime).isBetween(moment(tool.notificationStart), moment(tool.notificationEnd));
      if (!tool.notificationEnabled) {
        tool.notificationStart = undefined;
        tool.notificationEnd = undefined;
        tool.autoRemoveNotification = moment().add(48, 'hours');
        logger.info(`Notification automatically disabled for ${tool.name},
        Notification will be automatically deleted at: ${(tool.autoRemoveNotification)}`);
      }
      await tool.save();
    }
  } catch (updateErr) {
    logger.info(`Updating Notification Status failed for ${tool.name}: ${updateErr}`);
  }
}

async function updateToolNotificationStatus(tool) {
  try {
    if (tool.notificationJira && tool.notificationEnabled === true) {
      var jiraIssue = await getJiraIssueData(tool.notificationJira);
      if (jiraIssue.status === 'Closed') {
        tool.notificationEnabled = false;
        tool.autoRemoveNotification = moment().add(48, 'hours');
        await tool.save();
        logger.info(`Updated ${tool.name} notification to be disabled...`);
      }
    }
  } catch (updateErr) {
    logger.info(`Updating Notification Status failed for ${tool.name}: ${updateErr}`);
    if (process.env.NODE_ENV === 'production') await sendToolsTeamFailureEmail('Failed during execution', tool.name, tool.toolUrl, 'updateToolNotificationStatus', 'Notification Status Update', updateErr);
  }
}

async function sendCompletedEmail(log, fromServer) {
  logger.info(`Sending completed email for ${log.toolName}`);
  var emailData = {};
  emailData.toolName = log.toolName;
  emailData.logId = log._id;
  emailData.sender = log.userUpgrading;
  var emailParams = { emailType: 'completed' };
  exports.sendToolEmail({ params: emailParams, body: emailData, fromServer: fromServer }, {}, false);
}

exports.executeUpgrade = async function (req, res) {
  logObject = { log: 'not empty' };
  upgradeStartTime = req._startTime;
  toolUpgrading = await Tool.findOne({ name: req.params.tool });
  userUpgrading = req.user.displayName;
  upgradeFromVersion = req.params.currentVersion;
  upgradeToVersion = (req.fromServer) ? req.params.mergedVersion : req.params.newVersion.split(':')[0];
  var upgradeType = (semver.gte(upgradeToVersion, upgradeFromVersion)) ? 'upgrade' : 'downgrade';
  try {
    // eslint-disable-next-line max-len
    execPromise(`./${(process.env.NODE_ENV === 'production') ? 'upgradeScript.sh' : 'testScript.sh'} ${upgradeToVersion} ${toolUpgrading.name} ${toolUpgrading.toolUrl} ${toolUpgrading.folderPath} > terminalOutput 2>&1`);
    // eslint-disable-next-line max-len
    if (!req.fromServer) res.send(`Executing ./${(process.env.NODE_ENV === 'production') ? 'upgradeScript.sh' : 'testScript.sh'} for ${toolUpgrading.name} ${upgradeType} from ${upgradeFromVersion} to ${upgradeToVersion}`);
  } catch (upgradeErr) {
    if (!req.fromServer) {
      res.status(422).json({
        message: `Failed to ${upgradeType} Tool`,
        error: upgradeErr
      });
    }
    if (req.fromServer) await sendToolsTeamFailureEmailCI('Failed during execution', toolUpgrading.name, toolUpgrading.toolUrl, 'exports.executeUpgrade()', upgradeErr, false);
  }
};

exports.executeOQSUpgrade = async function (req, res) {
  logObject = { log: 'not empty' };
  upgradeStartTime = req._startTime;
  toolUpgrading = await Tool.findOne({ name: 'oqs-baseline' });
  userUpgrading = req.user.displayName;
  upgradeToVersionObject = {
    server: req.params.server,
    client: req.params.client,
    baseline: req.params.baseline,
    helpdocs: req.params.helpdocs,
    apidocs: req.params.apidocs
  };
  upgradeFromVersionObject = {
    server: req.params.serverFrom,
    client: req.params.clientFrom,
    baseline: req.params.baselineFrom,
    helpdocs: req.params.helpdocsFrom,
    apidocs: req.params.apidocsFrom
  };
  isOQS = true;
  try {
    // eslint-disable-next-line max-len
    execPromise(`./${(process.env.NODE_ENV === 'production') ? 'OQSUpgradeScript.sh' : 'testOQSUpgradeScript.sh'} ${toolUpgrading.toolUrl} ${toolUpgrading.folderPath} ${req.params.baseline} ${req.params.client} ${req.params.server} ${req.params.helpdocs} ${req.params.apidocs} > terminalOutput 2>&1`);
    // eslint-disable-next-line max-len
    if (!req.fromServer) res.send(`Executing ./${(process.env.NODE_ENV === 'production') ? 'OQSUpgradeScript.sh' : 'testOQSUpgradeScript.sh'} for ${toolUpgrading.toolUrl} ${toolUpgrading.folderPath} ${req.params.baseline} ${req.params.client} ${req.params.server} ${req.params.helpdocs} ${req.params.apidocs}`);
  } catch (upgradeErr) {
    if (!req.fromServer) {
      res.status(422).json({
        message: 'Failed to upgrade/downgrade Tool',
        error: upgradeErr
      });
    }
  }
};

async function createUpgradeLog(consoleOutput, emailData) {
  var oqs = [];
  if (emailData) {
    var userSender = await User.findOne({ username: emailData.sender });

    if (emailData.commits) {
      emailData.commits = emailData.commits.map(function (commit) {
        commit.issues.forEach(function (issue) {
          delete issue.issueUrl;
        });
        return commit;
      });
    }

    if (!emailData.isOQS) {
      logObject = {
        toolName: emailData.toolName,
        upgradeFromVersion: emailData.upgradeFromVersion,
        upgradeToVersion: emailData.upgradeToVersion,
        plannedUpgradeTime: emailData.dateTime,
        plannedEmail: {
          sentDate: emailData.sentDate,
          sender_id: userSender,
          recipients: emailData.recipients,
          commits: emailData.commits,
          subject: emailData.subject,
          content: emailData.content
        }
      };
    } else {
      var oqsVersions = {};
      Object.keys(emailData.upgradeFromVersion).forEach(function (version) {
        if (emailData.upgradeFromVersion[version] !== emailData.upgradeToVersion[version]) {
          var toolName = `oqs-${version}`;
          oqsVersions[toolName] = {
            upgradeFrom: emailData.upgradeFromVersion[version],
            upgradeTo: emailData.upgradeToVersion[version]
          };
        }
      });
      Object.keys(oqsVersions).forEach(function (version) {
        logObject = {
          toolName: version,
          upgradeFromVersion: oqsVersions[version].upgradeFrom,
          upgradeToVersion: oqsVersions[version].upgradeTo,
          plannedUpgradeTime: emailData.dateTime,
          plannedEmail: {
            sentDate: emailData.sentDate,
            sender_id: userSender,
            recipients: emailData.recipients,
            commits: emailData.commits,
            subject: emailData.subject,
            content: emailData.content
          }
        };
        oqs.push(logObject);
      });
    }
  } else {
    logObject = {
      toolName: toolUpgrading.name,
      upgradeFromVersion: upgradeFromVersion,
      upgradeToVersion: upgradeToVersion,
      userUpgrading: userUpgrading,
      startTime: upgradeStartTime,
      endTime: new Date(),
      consoleOutput: consoleOutput,
      healthCheckSuccessful: (!consoleOutput.includes('Health-check Failed.')),
      successful: (!consoleOutput.includes('upgrade failed'))
    };
  }
  try {
    if (emailData && emailData.isOQS) {
      await helperHandler.asyncForEach(oqs, async function (oqsRepo) {
        var log = new Log(oqsRepo);
        await log.validate();
        await log.save();
      });
    } else {
      var log = new Log(logObject);
      await log.validate();
      await log.save();
    }
  } catch (err) {
    logObject = {};
    logger.info(err);
  }
  logObject = {};
}

async function updateUpgradeLog(log, consoleOutput, emailData) {
  if (consoleOutput) {
    log.upgradeFromVersion = upgradeFromVersion;
    log.userUpgrading = userUpgrading;
    log.startTime = upgradeStartTime;
    log.endTime = new Date();
    log.consoleOutput = consoleOutput;
    log.healthCheckSuccessful = (!consoleOutput.includes('Health-check Failed.'));
    log.successful = (!consoleOutput.includes('upgrade failed'));
  }
  if (emailData) {
    var userSender = await User.findOne({ username: emailData.sender });
    if (emailData.commits) {
      emailData.commits = emailData.commits.map(function (commit) {
        commit.issues.forEach(function (issue) {
          delete issue.issueUrl;
        });
        return commit;
      });
    } else {
      emailData.commits = [];
    }
    log.completedEmail = {
      sentDate: emailData.sentDate,
      sender_id: userSender,
      recipients: emailData.recipients,
      commits: emailData.commits,
      subject: emailData.subject,
      content: emailData.content
    };
  }
  try {
    await log.validate();
    await log.save();
  } catch (err) {
    logObject = {};
    logger.info(err);
  }
  logObject = {};
}

async function sendToolsTeamWarningEmail(data) {
  var allContactInfo = await ContactInfo.find();
  var teamEmail = (allContactInfo.length !== 0) ? allContactInfo[0].teamEmail : '';
  var emailContent = await setupHealthCheckEmail(toolUpgrading.name, data);
  var emailBody = await getEmailBody(emailContent.content, toolUpgrading.name, true);
  var emailObject = {
    from: upgradeToolEmail,
    to: teamEmail,
    subject: emailContent.subject,
    html: emailBody,
    attachments: emailAttachment
  };
  logger.info('Sending Tools Team warning email.');
  if (process.env.NODE_ENV === 'production') helperHandler.sendMail(emailObject);
}

exports.getToolCommits = async function (req, res) {
  var toolName = req.params.tool;
  var newVersion = (toolName.includes('oqs')) ? req.params.version.trim() : `${toolName}-${req.params.version}`.trim();
  var currentVersion;
  var commits = [];
  var foundTool = await Tool.findOne({ name: toolName });
  if (!foundTool) {
    return res.status(422).json({
      message: `Failed to get Info for tool name: ${toolName}`
    });
  }
  try {
    var toolVersion = '';
    if (toolName.includes('oqs')) {
      var toolSufix = toolName.split('-')[1];
      toolVersion = await requestPromise(`http://${foundTool.toolUrl}/api/core/versions`);
      toolVersion = JSON.parse(toolVersion)[`${toolSufix}`];
      foundTool.currentVersion = toolVersion.trim();
      currentVersion = toolName.replace('oqs', 'openstack-queuing-solution');
      newVersion = `${currentVersion}-${newVersion}`;
      currentVersion += `-${toolVersion}`.trim();
    } else {
      toolVersion = await requestPromise(`http://${foundTool.toolUrl}/api/version`);
      currentVersion = `${toolName}-${toolVersion}`.trim();
    }
    var log = await Log.find({ toolName: toolName, upgradeToVersion: req.params.version }).sort({ $natural: -1 }).limit(1);
    log = (log.length) ? log[0] : '';
    if (semver.gte(req.params.version, toolVersion)) { // Upgrade
      commits = await getLatestCommits(toolName, currentVersion, newVersion);
    } else { // Downgrade
      commits = await getLatestCommits(toolName, newVersion, currentVersion);
    }
    if (!commits.includes('All Commits Released.')) {
      var commitsData = [];
      commitsData = await getCommitData(commits);
      if (commitsData) commits = commitsData;
    }
    var commitsInfo = { commits: commits, log: log };
    if (commits.includes('All Commits Released.')) commitsInfo = { message: commits, log: log };
    if (!req.fromServer) res.json(commitsInfo);
    // server request
    if (req.fromServer) return commitsInfo;
  } catch (getToolInfoErr) {
    if (!req.fromServer) {
      res.status(422).json({
        message: `Failed to get ${toolName} Commits: ${getToolInfoErr}`
      });
    } else {
      throw new Error(`Failed to get ${toolName} Commits: ${getToolInfoErr}`);
    }
  }
};

async function getCommitData(toolCommits) {
  toolCommits = toolCommits.split('\n');
  var commitsData = [];
  await helperHandler.asyncForEach(toolCommits, async function (commit) {
    commit = commit.split(',');
    var message = commit.slice(3, commit.length).join(',');
    var commitData = {
      commitUser: commit[1].trim(),
      commitMessage: message,
      issues: []
    };
    var commitMessage = commitData.commitMessage.toLowerCase();
    var commitTypes = ['minor', 'major', 'patch'];
    var issueList = [];
    var issueType = commitTypes.find(type => commitMessage.includes(type));
    if (issueType) {
      if (commitMessage.includes('no jira')) {
        commitsData.push(commitData);
      } else {
        var found = commitMessage.split(issueType);
        var issueNumber = found[0].replace(/\[|\]/g, '');
        issueList.push(issueNumber.trim());
      }
      if (issueList.length) {
        await helperHandler.asyncForEach(issueList, async function (issue) {
          var issueInfo = {};
          issueInfo.issue = issue.toUpperCase();
          issueInfo.issueUrl = `https://${process.env.JIRA_HOST}/browse/${issue}`;
          issueInfo.issueType = '';
          issueInfo.issueSummary = '';
          try {
            var jiraIssueData = await getJiraIssueData(issue);
            if (jiraIssueData.summary) {
              issueInfo.issueType = jiraIssueData.type;
              issueInfo.issueSummary = jiraIssueData.summary;
            }
          } catch (err) {
            // JIRA Unavailable
            logger.info(err);
          }
          commitData.issues.push(issueInfo);
        });
        commitsData.push(commitData);
      }
    }
  });
  return commitsData;
}

exports.updateToolCi = async function (req, res) {
  var tool = await Tool.findById(req.params.toolId);
  var toolLogs = await Log.find({ toolName: tool.name });
  tool.needsToBeUpgraded = false;
  tool.plannedUpgradeEmailSent = false;
  tool.ci = !tool.ci;
  if (toolLogs.length !== 0) {
    var latestLog = toolLogs[toolLogs.length - 1];
    if (latestLog.plannedEmail.sentDate && !latestLog.completedEmail.sentDate) {
      if (tool.ci) tool.needsToBeUpgraded = true;
      tool.plannedUpgradeEmailSent = true;
    }
  }
  await tool.save();
  await module.exports.ciEmail(req.user.username, tool.name, tool.ci);
  res.send(tool);
};

exports.sendToolEmail = async function (req, res, next) {
  var allContactInfo = await ContactInfo.find();
  var teamEmail = (allContactInfo.length !== 0) ? allContactInfo[0].teamEmail : '';
  var emailTypes = ['planned', 'completed'];
  var emailType = (req.params.emailType).toLowerCase();
  var emailData = req.body || {};
  var errorBase = `Failed to send email for ${emailData.toolName}, error:`;
  var emailContent,
    log,
    foundTool;
  var logObjects = [];
  if (!emailTypes.includes(emailType) && !req.fromServer) {
    return (next) ? res.status(422).send({ message: `${errorBase} Invalid email type '${emailType}', should be one of ${emailTypes.join(',')}.` }) : null;
  }
  try {
    // Get Tool information
    foundTool = await Tool.findOne({ name: emailData.toolName });
    if (!foundTool && !req.fromServer) {
      return (next) ? res.status(422).json({ message: `${errorBase} Tool not found` }) : null;
    }
    if (emailType === 'planned') {
      emailContent = await setupPlannedEmail(emailData);
    } else {
      log = await Log.findById(emailData.logId);
      if (!log && !req.fromServer) {
        return (next) ? res.status(422).json({ message: `${errorBase} No log found for id ${emailData.logId}` }) : null;
      }
      if (log.toolName !== emailData.toolName && !req.fromServer) {
        return (next) ? res.status(422).json({ message: `${errorBase} Tool name does not match log tool name '${log.toolName}'` }) : null;
      }
      // eslint-disable-next-line max-len
      var logs = await Log.find({ startTime: log.startTime, toolName: (log.toolName.includes('oqs-')) ? { $regex: 'oqs-', $options: log.toolName } : log.toolName });
      if (logs.length && log.toolName.includes('oqs-')) {
        emailData.isOQS = true;
        logs.forEach(function (log) {
          var logToolName = log.toolName;
          logObjects.push({
            [logToolName]: {
              upgradeFromVersion: log.upgradeFromVersion,
              upgradeToVersion: log.upgradeToVersion
            },
            ['startTime']: log.startTime
          });
        });
        emailData.upgradeFromVersion = logObjects;
      } else {
        emailData.upgradeFromVersion = log.upgradeFromVersion;
        emailData.upgradeToVersion = log.upgradeToVersion;
      }
      emailData.recipients = (log.plannedEmail.recipients.length) ? log.plannedEmail.recipients : foundTool.EmailRecipients;
      emailContent = await setupCompleteEmail(emailData);
    }
    var isCompletedEmail = (emailType === 'completed');
    var emailBody = await getEmailBody(emailContent.content, emailData.toolName, false, isCompletedEmail);
    var emailObject = {
      from: upgradeToolEmail,
      to: emailData.recipients,
      cc: teamEmail,
      subject: emailContent.subject,
      html: emailBody,
      attachments: emailAttachment
    };
    logger.info(`Sending ${emailType} email for ${emailData.toolName}`);
    if (process.env.NODE_ENV === 'production') helperHandler.sendMail(emailObject);
    emailData.subject = emailContent.subject;
    emailData.content = emailBody;
    emailData.sentDate = new Date();
    if (emailType === 'planned') {
      await createUpgradeLog(undefined, emailData);
      if (foundTool.ci) {
        foundTool.needsToBeUpgraded = true;
        foundTool.plannedUpgradeEmailSent = true;
        await foundTool.save();
      }
    } else if (emailData.isOQS) {
      await helperHandler.asyncForEach(emailData.upgradeFromVersion, async function (version) {
        var oqsName = Object.keys(version)[0];
        var upgradeFrom = Object.values(version)[0].upgradeFromVersion;
        var upgradeTo = Object.values(version)[0].upgradeToVersion;
        var startTime = Object.values(version)[1];
        var log2 = await Log.findOne({
          toolName: oqsName, upgradeFromVersion: upgradeFrom, upgradeToVersion: upgradeTo, startTime: startTime
        });
        await updateUpgradeLog(log2, undefined, emailData);
      });
    } else await updateUpgradeLog(log, undefined, emailData);
  } catch (sendingEmailError) {
    return (next && !req.fromServer) ? res.status(422).json({ message: `${errorBase} ${JSON.stringify(sendingEmailError)}` }) : null;
  }
  return (next && !req.fromServer) ? res.status(200).json({ message: `Successfully sent email for ${emailData.toolName}` }) : null;
};

async function setupPlannedEmail(emailData) {
  var oqsVersions = {};
  var upgradeType = '';
  var foundTool = {};
  var toolName = '';
  if (!emailData.isOQS) {
    foundTool = await Tool.findOne({ name: emailData.toolName });
    toolName = foundTool.toolEmailName;
    upgradeType = (semver.gte(emailData.upgradeToVersion, emailData.upgradeFromVersion)) ? 'Upgrade' : 'Downgrade';
  } else {
    Object.keys(emailData.upgradeFromVersion).forEach(function (version) {
      if (emailData.upgradeFromVersion[version] !== emailData.upgradeToVersion[version]) {
        toolName = `Openstack queueing solution ${version}`;
        oqsVersions[toolName] = {
          upgradeFrom: emailData.upgradeFromVersion[version],
          upgradeTo: emailData.upgradeToVersion[version]
        };
      }
    });
    upgradeType = (emailData.isUpgrade === 'upgrade') ? 'Upgrade' : 'Downgrade';
  }
  var updateTime = emailData.dateTime;
  if (emailData.useDefaultTime) {
    updateTime = getUpgradeTime(foundTool.name, emailData.dateTime);
  }
  var emailHeader = '';
  var emailSubject = '';
  var isDaylightSavingsTime = momentTimeZone(updateTime).tz('Europe/London').isDST();
  var timezoneString = `GMT${isDaylightSavingsTime ? '+1' : ''}`;

  if (emailData.isOQS) {
    Object.keys(oqsVersions).forEach(function (version) {
      emailHeader += `<h2 style="text-align:center">${version}: From ${oqsVersions[version].upgradeFrom} to ${oqsVersions[version].upgradeTo}</h2>`;
    });
    emailHeader += '<br></div>';
    emailSubject = `Planned ${upgradeType} of OQS at ${moment(updateTime).format('dddd MMMM Do h:mm a')} ${timezoneString}`;
  } else {
    emailHeader = `<h2 style="text-align:center">${toolName}: From ${emailData.upgradeFromVersion} to ${emailData.upgradeToVersion}</h2><br></div>`;
    emailSubject = `Planned ${upgradeType} of ${toolName} at ${moment(updateTime).format('dddd MMMM Do h:mm a')} ${timezoneString}`;
  }
  var emailCommits = htmlBeforeEmailCommits;
  if (emailData.commits) {
    if (!emailData.isOQS) {
      emailData.commits.forEach(function (commit) {
        var commitDetails = '';
        if (commit.issues.length) {
          var commitMessage = commit.commitMessage.split(' [');
          commit.issues.forEach(function (issueInfo, index) {
            var message = issueInfo.issueSummary;
            if (!message) {
              message = commitMessage[index + 1].replace(issueInfo.issue, '').replace(']', '');
            }
            commitDetails = commitDetails.concat(`<li><strong>[<a href="${issueInfo.issueUrl}">${issueInfo.issue}</a>]</strong> ${message}`);
            if (issueInfo.comment) {
              commitDetails = commitDetails.concat(`<br>&nbsp;&nbsp;<strong>Note:</strong> ${issueInfo.comment}`);
            }
            commitDetails = commitDetails.concat('</li>');
          });
        } else {
          commitDetails = '<li>';
          commitDetails = commitDetails.concat(`${commit.commitMessage}`);
          if (commit.comment) {
            commitDetails = commitDetails.concat(`<br>&nbsp;&nbsp;<strong>Note:</strong> ${commit.comment}`);
          }
          commitDetails = commitDetails.concat('</li>');
        }
        emailCommits = emailCommits.concat(commitDetails);
      });
    } else {
      var emailCommits1 = [...new Set(emailData.commits.map(commit => commit.issues[0]))];
      var emailCommitsUnique = [...new Map(emailCommits1.map(item => [item.issue, item])).values()];
      emailCommitsUnique.forEach(function (commit) {
        var commitDetails = '';
        if (commit.issueUrl.includes('http')) {
          commitDetails = commitDetails.concat(`<li><strong>[<a href="${commit.issueUrl}">${commit.issue}</a>]</strong> ${commit.issueSummary}`);
        } else {
          commitDetails = commitDetails.concat(`<li>${commit.issueSummary}`);
        }
        if (commit.comment) {
          commitDetails = commitDetails.concat(`<br>&nbsp;&nbsp;<strong>Note:</strong> ${commit.comment}`);
        }
        commitDetails = commitDetails.concat('</li>');
        emailCommits = emailCommits.concat(commitDetails);
      });
    }
  }

  emailCommits = emailCommits.concat('</ul>');
  // eslint-disable-next-line quotes
  var commentFiller = `</p><br><p class="MsoNormal"><b><span style='font-family:"Ericsson Hilda";color:#000'>`;
  var emailContent = `${emailHeader}</td></tr>`;
  if (emailData.comment) {
    emailContent = emailContent.concat(`${htmlAfterEmailHeader}NOTE:</b>  ${emailData.comment}`);
    emailContent = emailContent.concat(`${commentFiller}Updates:</b></span>${emailCommits}</p>${updatesEnd}`);
  } else {
    emailContent = emailContent.concat(`${htmlAfterEmailHeader}Updates:</b></span>${emailCommits}</p>${updatesEnd}`);
  }
  return { subject: emailSubject, content: emailContent };
}

async function setupCompleteEmail(emailData) {
  var foundTool,
    toolName,
    upgradeType,
    emailHeader,
    emailContent,
    emailSubject;
  if (!emailData.isOQS) {
    foundTool = await Tool.findOne({ name: emailData.toolName });
    toolName = foundTool.toolEmailName;
    upgradeType = (semver.gte(emailData.upgradeToVersion, emailData.upgradeFromVersion)) ? 'Upgrade' : 'Downgrade';
    emailSubject = `Completed ${upgradeType} of ${toolName} to Version ${emailData.upgradeToVersion}`;
    emailHeader = `<h2 style="text-align:center">Successful ${upgradeType} of ${toolName} to ${emailData.upgradeToVersion}</h2><br>`;
    emailContent = `${emailHeader}</td></tr>`;
  } else {
    emailHeader = '';
    await helperHandler.asyncForEach(emailData.upgradeFromVersion, async function (version) {
      var oqsName = Object.keys(version)[0];
      var upgradeFrom = Object.values(version)[0].upgradeFromVersion;
      var upgradeTo = Object.values(version)[0].upgradeToVersion;
      foundTool = await Tool.findOne({ name: oqsName });
      toolName = foundTool.toolEmailName;
      upgradeType = (semver.gte(upgradeTo, upgradeFrom)) ? 'Upgrade' : 'Downgrade';
      emailHeader += `<h2 style="text-align:center">Successful ${upgradeType} of ${toolName} to ${upgradeTo}</h2>`;
      emailSubject = `Completed ${upgradeType} of OQS successfully`;
    });
    emailContent = `${emailHeader}</td></tr>`;
  }
  return { subject: emailSubject, content: emailContent };
}

async function setupHealthCheckEmail(toolName, data) {
  var foundTool = await Tool.findOne({ name: toolName });
  var toolNameUsed = foundTool.toolEmailName;
  // this gets the number of how many tests passed aswell
  var headerStart = await data.indexOf('passing') - 3;
  var headerEnd = await data.indexOf('failing') + 7;
  var header = data.slice(headerStart, headerEnd);
  var headerSplit = header.split('\n');
  var errors = data.slice(headerEnd);
  var errorsSplit = errors.split('\n');
  var successUpgrade = (data.includes('upgrade complete.')) ? 'Successful' : 'Failed';
  var emailSubject = `Completed Health Check and Upgrade of ${toolNameUsed} From ${upgradeFromVersion} to ${upgradeToVersion}`;
  var emailHeader = `<h2 style="text-align:center">Failed Health Check of ${toolNameUsed}</h2>
                     <h2 style="text-align:center">${successUpgrade} Upgrade of ${toolNameUsed}</h2>
                     <h2 style="text-align:center">From ${upgradeFromVersion} to ${upgradeToVersion}</h2><br></div>`;
  var emailContent = `${emailHeader}</div><a>${headerSplit[0]}</a><br><a>${headerSplit[1]}</a>`;
  errorsSplit.forEach(error => {
    emailContent += `<br><a>${error}</a>`;
  });
  return { subject: emailSubject, content: emailContent };
}

async function getEmailBody(content, toolName, upgradeEmail, isCompletedEmail) {
  var allContactInfo = await ContactInfo.find();
  var contactInfo = (allContactInfo.length !== 0) ? allContactInfo[0] : '';
  var foundTool = await Tool.findOne({ name: toolName });
  if (!foundTool) {
    throw new Error(`Failed to get Info for tool name: ${toolName}`);
  }
  toolName = foundTool.toolEmailName;
  var emailContactInfo = '';
  // eslint-disable-next-line quotes
  var contactLineStart = `<p class="MsoNormal"><span style='font-family:"Ericsson Hilda";color:#000'><b>`;
  // eslint-disable-next-line quotes
  var contactEnd = `<span style='font-family:"Ericsson Hilda"'><o:p></o:p></span></p>`;
  if (allContactInfo.length !== 0) {
    var scrumMaster = await User.findById(contactInfo.scrumMaster);
    var productOwner = await User.findById(contactInfo.productOwner);
    emailContactInfo = emailContactInfo.concat(`${contactLineStart}SM: ${scrumMaster.displayName} - </b> ${scrumMaster.email}${contactEnd}`);
    emailContactInfo = emailContactInfo.concat(`${contactLineStart}PO: ${productOwner.displayName} - </b> ${productOwner.email}${contactLineStart}`);
    emailContactInfo = emailContactInfo.concat(`${contactLineStart}Team: ${contactInfo.team} - </b> ${contactInfo.teamEmail}${contactLineStart}`);
    emailContactInfo = emailContactInfo.concat(`
    ${contactLineStart}Jira: </span><span style='font-family:"Ericsson Hilda"'><o:p></o:p></span>
    <a href="${contactInfo.jiraTemplateUrl}">${contactInfo.team} - JIRA Template</a></p><br>`);
  }
  var emailBody = `${emailCss}
  ${content}
  </div>`;

  if (upgradeEmail) {
    emailBody += '<br></body></html>';
    return emailBody;
  }

  // eslint-disable-next-line quotes
  var beforeChangeLog = `<p class=MsoNormal><b><span style='font-family:"Ericsson Hilda";color:black'>`;
  if (isCompletedEmail) beforeChangeLog = htmlAfterEmailHeader;
  if (foundTool.name.startsWith('oqs-')) {
    var allOqsRepos = await Tool.find({ name: /.*oqs-.*/ });
    emailBody += `${beforeChangeLog}Change Logs:</span><span style='font-family:"Ericsson Hilda"'><o:p></o:p></span></b></p><ul>`;
    await helperHandler.asyncForEach(allOqsRepos, async function (oqsRepo) {
      emailBody += `<li>
                      <a href="${oqsRepo.changeLogUrl}">${oqsRepo.toolEmailName} Change log</a>
                    </li>`;
    });
    emailBody += `</ul><b><p>${minifySpanStart}Contact for more information:</span></b>${emailContactInfo}</p><br><br>${emailEndHtml}</body></html>`;
  } else {
    emailBody += `${beforeChangeLog}Change Log:</span><span style='font-family:"Ericsson Hilda"'><o:p></o:p></span></b></p><ul><li>
                  <a href="${foundTool.changeLogUrl}">${toolName} Change log</a>
                  </li></ul><br><br>
                  <b>${minifySpanStart}Contact for more information:</span></b>${emailContactInfo}</p>
                  <br><br>${emailEndHtml}</body></html>`;
  }
  return emailBody;
}
// CI FUNCTIONS
async function updateToolsSettingCurrentVersions() {
  logger.info('Updating Current Tool Versions');
  var allTools = await Tool.find();
  await helperHandler.asyncForEach(allTools, async function (foundTool) {
    var toolVersion = '';
    if (foundTool.name.includes('oqs')) {
      var toolSufix = foundTool.name.split('-')[1];
      toolVersion = await requestPromise(`http://${foundTool.toolUrl}/api/core/versions`)[`${toolSufix}`];
    } else toolVersion = await requestPromise(`http://${foundTool.toolUrl}/api/version`);
    foundTool.currentVersion = toolVersion.trim();
    await foundTool.save();
  });
}

async function updateToolsSettingMergedVersions() {
  logger.info('Updating Merged Tool Versions');
  var allTools = await Tool.find();
  await helperHandler.asyncForEach(allTools, async function (foundTool) {
    var mergedVersion = await execPromise(`cd allTools && cd ${foundTool.name} && git describe`);
    if (foundTool.name.includes('oqs')) foundTool.mergedVersion = mergedVersion.stdout;
    else foundTool.mergedVersion = mergedVersion.stdout.split('-').reverse()[2];
    await foundTool.save();
  });
}

async function updateMongoAfterUpgrade(tool) {
  logger.info(`Updating Mongo After Upgrade has finished for ${tool.name}`);
  var foundTool = await Tool.findOne({ name: tool.name });
  foundTool.plannedUpgradeEmailSent = false;
  foundTool.needsToBeUpgraded = false;
  await foundTool.save();
}

async function updateCurentAndMergedVersions() {
  await updateToolsSettingCurrentVersions();
  await updateToolsSettingMergedVersions();
}

async function updateIfToolsNeedsUpgrade() {
  var allTools = await Tool.find();
  await helperHandler.asyncForEach(allTools, async function (foundTool) {
    var isUpgrade = semver.gt(foundTool.mergedVersion, foundTool.currentVersion);
    foundTool.needsToBeUpgraded = (foundTool.ci && isUpgrade);
    await foundTool.save();
    logger.info(`${foundTool.name} needs an upgrade: ${foundTool.ci && isUpgrade}`);
  });
}

function getUpgradeDate(toolName) {
  var today = moment();
  // Check if mon-thursday 0-4, set next day. else closest monday
  var correctDay = (today.day() < 4) ? today.add(1, 'days') : today.add(1, 'weeks').startOf('isoWeek');
  switch (toolName) {
    case 'de-object-store':
      return moment(correctDay.set({ hour: 11, minute: 0 }));
    case 'booking-tool':
      return moment(correctDay.set({ hour: 10, minute: 30 }));
    case 'deployment-inventory-tool':
      return moment(correctDay.set({ hour: 10, minute: 0 }));
    case 'oqs-baseline':
      return moment(correctDay.set({ hour: 11, minute: 30 }));
    case 'CM-Portal':
      return moment(correctDay.set({ hour: 10, minute: 45 }));
    default:
    // do nothing
  }
}

function getUpgradeTime(toolName, emailDateTime, forCI) {
  emailDateTime = moment(emailDateTime);
  switch (toolName) {
    case 'de-object-store':
      return (forCI) ? '11.00' : moment(emailDateTime.set({ hour: 11, minute: 0 }));
    case 'booking-tool':
      return (forCI) ? '10.00' : moment(emailDateTime.set({ hour: 10, minute: 30 }));
    case 'deployment-inventory-tool':
      return (forCI) ? '10.30' : moment(emailDateTime.set({ hour: 10, minute: 0 }));
    case 'oqs-baseline':
      return (forCI) ? '11.30' : moment(emailDateTime.set({ hour: 11, minute: 30 }));
    case 'CM-Portal':
      return (forCI) ? '10.45' : moment(emailDateTime.set({ hour: 10, minute: 45 }));
    default:
    // do nothing
  }
}

async function updateUpgradeDateAndSendPlanned(tool) {
  var upgradeDate = getUpgradeDate(tool.name);
  var foundTool = await Tool.findOne({ name: tool.name });
  foundTool.upgradeDate = upgradeDate;
  await foundTool.save();
  try {
    await sendPlannedUpgradeEmailCI(foundTool, upgradeDate);
  } catch (error) {
    await cancelToolUpgradeCI(foundTool, 'updateUpgradeDateAndSendPlanned');
    await sendToolsTeamFailureEmailCI('Planned Email Sending Failed', foundTool.name, foundTool.toolUrl, 'updateUpgradeDateAndSendPlanned()', error, true);
  }
}

async function cancelToolUpgradeCI(tool, functionCalled) {
  logger.info(`Something went wrong in ${functionCalled}, canceling tool CI`);
  var foundTool = await Tool.findOne({ name: tool.name });
  foundTool.ci = false;
  foundTool.needsToBeUpgraded = false;
  foundTool.plannedUpgradeEmailSent = false;
  await foundTool.save();
}

async function sendPlannedUpgradeEmailCI(tool, upgradeDate) {
  var getToolCommitsObj = {
    params: {
      tool: tool.name,
      version: tool.mergedVersion
    },
    fromServer: true
  };
  var toolCommits = await exports.getToolCommits(getToolCommitsObj, false, true);
  // update recipients
  var foundTool = await Tool.findOne({ name: tool.name });

  var req = {
    body: {
      toolName: foundTool.name,
      recipients: foundTool.recipients,
      comment: '',
      commits: toolCommits.commits,
      dateTime: upgradeDate,
      sender: 'dttadm100',
      upgradeFromVersion: tool.currentVersion,
      upgradeToVersion: tool.mergedVersion
    },
    params: {
      emailType: 'planned'
    },
    fromServer: true
  };
  try {
    if (!tool.plannedUpgradeEmailSent) {
      await exports.sendToolEmail(req);
      // update email been sent
      var toolFound = await Tool.findOne({ name: tool.name });
      toolFound.plannedUpgradeEmailSent = true;
      await toolFound.save();
    }
  } catch (error) {
    throw new Error(`Error Sending Planned Email CI. ${error}`);
  }
}

async function executeUpgradeCI(tool) {
  var mergedVersion = tool.mergedVersion;
  var toolLogs = await Log.find({ toolName: tool.name });
  if (toolLogs.length !== 0) {
    var latestLog = toolLogs[toolLogs.length - 1];
    if (latestLog.plannedEmail.sentDate && !latestLog.completedEmail.sentDate) {
      mergedVersion = latestLog.upgradeToVersion;
    }
  }
  var reqObj = {
    _startTime: tool.upgradeDate,
    params: {
      tool: tool.name,
      currentVersion: tool.currentVersion,
      mergedVersion: mergedVersion
    },
    user: {
      displayName: 'dttadm100'
    },
    fromServer: true,
    toolUrl: tool.toolUrl
  };
  try {
    if (tool.plannedUpgradeEmailSent && tool.needsToBeUpgraded) {
      logger.info(`Executing upgrade script for ${tool.name}`);
      await module.exports.ciEmail(reqObj.user.displayName, tool.name, tool.ci, true);
      await exports.executeUpgrade(reqObj);
      // Keep checking until process is finished
      const interval = setInterval(async function () {
        fs.readFile('terminalOutput', 'utf8', async function (err, data) {
          if (data.includes('PROCESS FINISHED')) {
            fs.writeFile('terminalOutput', 'Empty', (err, data) => {
            });
            clearInterval(interval);
            // eslint-disable-next-line max-len
            var log = await Log.find({ toolName: toolUpgrading.name, upgradeToVersion: toolUpgrading.mergedVersion }).sort({ $natural: -1 }).limit(1);
            if (log.length) {
              log = log[0];
              await updateUpgradeLog(log, data);
            } else {
              await createUpgradeLog(data);
            }
            var healthcheckPassed = data.includes('Health-check Passed.');
            var upgradeSuccessful = data.includes('upgrade complete.');
            if (upgradeSuccessful && healthcheckPassed) {
              await sendCompletedEmail(log, true);
            }
            if (!healthcheckPassed) await sendToolsTeamWarningEmail(data);
            if (!upgradeSuccessful) await sendToolsTeamFailureEmailCI('Upgrade Failed during CI', toolUpgrading.name, toolUpgrading.toolUrl, 'executeUpgradeCI()', 'Upgrade not successful');

            // update after upgrade
            await updateMongoAfterUpgrade(toolUpgrading);
          }
        });
      }, 5000);
    }
  } catch (error) {
    await sendToolsTeamFailureEmailCI('Failed executing upgrade', tool.name, tool.toolUrl, 'executeUpgradeCI()', error, true);
    await cancelToolUpgradeCI(tool, 'executeUpgradeCI');
  }
}

async function sendToolsTeamFailureEmailCI(subject, toolName, toolURL, functionName, error, ciDisabled) {
  var allContactInfo = await ContactInfo.find();
  var teamEmail = (allContactInfo.length !== 0) ? allContactInfo[0].teamEmail : '';
  var ciDisabledText = (ciDisabled) ? `<strong>CI was switched off automatically for:</strong> ${toolName}<br></br>` : '';
  var emailBody = `${emailCss}
  <br>
  ${ciDisabledText}
  </div></div><hr><strong>Tool URL:</strong><a>${toolURL}</a><br>
  <strong>Function name:</strong> ${functionName}<br>
  <strong>Error:</strong><p>${error}</p><br>
  <h5> Investigate and take necessary steps.</h5><br><br><hr>
  </div>`;
  var emailObject = {
    from: upgradeToolEmail,
    to: teamEmail,
    subject: `CI Upgrade Tool: ${subject}`,
    html: emailBody,
    attachments: emailAttachment
  };
  logger.info('Sending CI Failed email.');
  if (process.env.NODE_ENV === 'production') helperHandler.sendMail(emailObject);
}

async function startCIUpgrade(toolName) {
  var toolToUpgrade = await Tool.findOne({ name: toolName, ci: true, needsToBeUpgraded: true });
  if (toolToUpgrade) await executeUpgradeCI(toolToUpgrade);
}

module.exports.ciEmail = async function (userName, toolName, ciEnabled, upgradeStarted = false) {
  var noteMsg = '';
  var toolLogs = await Log.find({ toolName: toolName });
  if (toolLogs.length !== 0) {
    var latestLog = toolLogs[toolLogs.length - 1];
    if (latestLog.plannedEmail.sentDate && !latestLog.completedEmail.sentDate) {
      var upgradeTime = getUpgradeTime(toolName, '', true);
      noteMsg = `<strong>Note:</strong> Planned Upgrade Email has been sent
      but with CI Enabled, the default upgrade time of ${upgradeTime} will be used for the tool.<br>`;
    }
  }
  var currentDateTime = `${moment().format('dddd MMMM Do h:mm a')} GMT`;
  var userInfo = await User.findOne({ username: userName });
  var allContactInfo = await ContactInfo.find();
  var teamEmail = (allContactInfo.length !== 0) ? allContactInfo[0].teamEmail : '';
  var emailSubject = `CI for ${toolName} ${(upgradeStarted) ? 'upgrade in progress.' : 'was Updated.'}`;
  var emailBody = `${emailCss}
                  <h2 style="text-align:center">CI `;
  try {
    if (upgradeStarted) {
      emailBody += `for ${toolName} upgrade in progress. </h2></div></div><hr><br>`;
    } else {
      emailBody += `was ${(ciEnabled) ? 'Enabled' : 'Disabled'} for ${toolName}</h2>
      <hr><br><h5>Upgrade Tool will${(ciEnabled) ? '' : ' not'} automatically upgrade the tool.</h5>
      ${(ciEnabled) ? noteMsg : ''}`;
    }
    emailBody += `<strong>Change At:</strong> ${currentDateTime}<br>
                  <strong>Change By:</strong> ${userInfo.displayName} (${userInfo.email})
                  </div>`;
  } catch (emailSetupError) {
    logger.info('ERROR in ciEmail function: ');
    logger.info(emailSetupError);
  }

  var emailObject = {
    from: upgradeToolEmail,
    to: teamEmail,
    subject: emailSubject,
    html: emailBody,
    attachments: emailAttachment
  };
  logger.info('Sending CI email.');
  if (process.env.NODE_ENV === 'production') helperHandler.sendMail(emailObject);
};

async function sendToolsTeamFailureEmail(subject, toolName, toolURL, functionName, action, error) {
  var allContactInfo = await ContactInfo.find();
  var teamEmail = (allContactInfo.length !== 0) ? allContactInfo[0].teamEmail : '';
  var emailBody = `${emailCss}
  <h2 style="text-align:center">Failed Execute ${action} For ${toolName}</h2></div></div>
  <br>
  <p class=MsoNormal><b><span style='font-family:"Ericsson Hilda";color:black'>&nbsp;&nbsp;Details: </span>
  <span style='font-family:"Ericsson Hilda"'><o:p></o:p></span></b></p>
  <ul>
  <li><strong>Tool URL:</strong> <a href="https://${toolURL}">${toolURL}</a></li>
  <li><strong>Function name:</strong> ${functionName}</li>
  <li><strong>Error:</strong> ${error}</li>
  </ul>
  <h5>&nbsp;&nbsp;Investigate and take necessary steps.</h5>
  </body></html>`;
  var emailObject = {
    from: upgradeToolEmail,
    to: teamEmail,
    subject: `Upgrade Tool: ${subject}`,
    html: emailBody,
    attachments: emailAttachment
  };
  logger.info('Sending Function Failed email.');
  if (process.env.NODE_ENV === 'production') helperHandler.sendMail(emailObject);
}

// JIRA Functions
async function getJiraIssueData(jiraIssue) {
  jiraIssue = jiraIssue.trim().toUpperCase();
  var jiraClient = helperHandler.getJiraClient();
  try {
    var issueData = await jiraClient.issue.getIssue({ issueKey: jiraIssue });
    return {
      summary: issueData.fields.summary,
      status: issueData.fields.status.name,
      type: issueData.fields.issuetype.name
    };
  } catch (err) {
    return { errorMessage: err.toString() };
  }
}

exports.jiraIssueValidation = async function (request, response) {
  var jiraIssue = request.params.issue;
  jiraIssue = jiraIssue.trim();
  var jira = helperHandler.getJiraClient();
  await jira.issue.getIssue({
    issueKey: jiraIssue
  }, function (error, issue) {
    if (error) {
      if (error.errorMessages) {
        response.send({ valid: false, errorMessages: error.errorMessages });
      } else {
        response.send({ errorMessage: error });
      }
      return;
    }
    response.send({
      valid: true,
      summary: issue.fields.summary,
      status: issue.fields.status.name
    });
  });
};

// nodeSchedules
if (process.env.NODE_ENV === 'production') {
  // Runs Mon-Friday every 30 mintues  - checking JIRA status
  nodeSchedule.scheduleJob('*/30 * * * 1-5', async function () {
    var allTools = await Tool.find();
    await helperHandler.asyncForEach(allTools, async function (tool) {
      logger.info(`Checking ${tool.name} notification JIRA Issue status...`);
      await updateToolNotificationStatus(tool);
    });
  });

  // Runs every an hour - assigning Notification status based on Date & Time
  nodeSchedule.scheduleJob('00 00 */1 * * *', async function () {
    var allTools = await Tool.find();
    await helperHandler.asyncForEach(allTools, async function (tool) {
      logger.info(`Checking ${tool.name} scheduled notifications`);
      await updatetoolNotificationOnDateTime(tool);
    });
  });

  // Runs Mon-Friday every 30 minutes  - removing expired notification details
  nodeSchedule.scheduleJob('*/30 * * * *', async function () {
    var allTools = await Tool.find();
    await helperHandler.asyncForEach(allTools, async function (tool) {
      logger.info(`Checking ${tool.name} to remove expired Notification`);
      await updateToolNotificationByAutoRemoveDate(tool);
    });
  });

  // Runs Mon-Friday 11.55 day updates versions in mongo
  nodeSchedule.scheduleJob('00 55 11 * * 1-5', async function () {
    await updateCurentAndMergedVersions();
  });

  // Runs Mon-Friday 11.57 day checks if any tools needs to be upgraded
  nodeSchedule.scheduleJob('00 57 11 * * 1-5', async function () {
    await updateIfToolsNeedsUpgrade();
  });

  // Runs Mon-Friday 12.00 day - send planned emails
  nodeSchedule.scheduleJob('00 00 12 * * 1-5', async function () {
    var allTools = await Tool.find();
    await helperHandler.asyncForEach(allTools, async function (tool) {
      logger.info(`\n${tool.name}
      Current version:${tool.currentVersion}
      Merged version: ${tool.mergedVersion}
      Needs an Upgrade: ${tool.needsToBeUpgraded}
      CI:${tool.ci}`);
      if (tool.needsToBeUpgraded) await updateUpgradeDateAndSendPlanned(tool);
    });
  });

  // DIT Upgrade 10.00
  nodeSchedule.scheduleJob('00 00 10 * * 1-4', async function () {
    await startCIUpgrade('deployment-inventory-tool');
  });

  // CM-Portal Upgrade 10.45
  nodeSchedule.scheduleJob('00 45 10 * * 1-4', async function () {
    await startCIUpgrade('CM-Portal');
  });

  // DTT Upgrade 10.30
  nodeSchedule.scheduleJob('00 30 10 * * 1-4', async function () {
    await startCIUpgrade('booking-tool');
  });

  // OST Upgrade 11.00
  nodeSchedule.scheduleJob('00 00 11 * * 1-4', async function () {
    await startCIUpgrade('de-object-store');
  });
}
