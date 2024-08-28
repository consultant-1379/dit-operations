import _ from 'lodash';
import { asyncForEach } from '../../../core/client/controllers/helpers.client.controller';
var http = require('http');
var moment = require('moment');
var $ = require('jquery');
var semver = require('semver');
window.jQuery = $;
window.$ = $;
homeController.$inject = ['$scope', '$window', '$http', '$state',
  'Notification', 'Authentication', 'allLogs', 'allTools', 'allContactInfo',
  'allUsers'];

export default function homeController(
  $scope, $window, $http, $state,
  Notification, Authentication, allLogs, allTools, allContactInfo,
  allUsers
) {
  var vm = this;
  vm.tools = allTools;
  vm.loading = true;
  vm.isOQS = false;
  vm.oqsToggle = false;
  var stopRefresh;
  var host = (process.env.NODE_ENV === 'production') ? 'atvts2716.athtem.eei.ericsson.se' : 'Paste your VM address here'; // Use your VM local host for dev purposes.
  vm.useDefaultTime = false;
  vm.isUpgradeButton = true;
  var port = 80;
  if (vm.tools.length === 0) {
    vm.loading = false;
  }

  vm.toggleToolCI = async function (toolName) {
    var tool = vm.tools.find(tool => tool.name === toolName);
    try {
      // update ci of the tool
      await $http({
        method: 'PUT',
        url: `/api/updateToolCi/${tool._id}`,
        headers: { 'Content-Type': 'application/json' }
      }).then(function (res) {
        vm[toolName].ci = res.data.ci;
      }, function (err) {
        Notification.error({
          message: JSON.stringify(err),
          title: `<i class="glyphicon glyphicon-remove"></i> ERROR: Failed to set ci value for ${toolName}!`
        });
      });
    } catch (requestError) {
      console.log(requestError); // eslint-disable-line no-console
    }
  };

  vm.showOQSRepos = async function () {
    $('.OQS').toggle();
    vm.oqsToggle = !vm.oqsToggle;
    _.defer(() => $scope.$apply());
  };

  vm.populateToolInfo = async function (toolName) {
    try {
      var getToolInfo = {
        hostname: host,
        port: port,
        path: `/api/toolinfo/${toolName}`,
        method: 'GET'
      };

      var getToolInfoReq = http.request(getToolInfo, getToolInfoResponse => {
        getToolInfoResponse.on('data', async function (dataReceived) {
          vm.refreshTerminal();
          clearTimeout(stopRefresh);
          var jsonReceived = JSON.parse(dataReceived);
          vm[toolName].mergedVersion = jsonReceived.mergedVersion;
          vm[toolName].commits = jsonReceived.commits;
          vm[toolName].previousCommits = jsonReceived.previousCommits;
          vm[toolName].versions = jsonReceived.otherVer;
          vm[toolName].currentVersion = jsonReceived.currentVersion;
          vm[toolName].versionList = '-- Select Version --';
          vm[toolName].upgradeButtonDisabled = false;
          vm[toolName].showcommits = false;
          vm[toolName].recipients = jsonReceived.recipients;
          vm[toolName].plannedEmailMessage = '';
          vm[toolName].ci = jsonReceived.ci;
          vm.useDefaultTime = vm[toolName].ci;
          if (toolName.startsWith('oqs-')) vm[toolName].displayName = capitalizeFirstLetter(toolName.split('-')[1]);
          if (toolName.startsWith('oqs-') && !vm[toolName].versions.find(version => version.includes(': n + 1'))) {
            vm[toolName].versionList = vm[toolName].versions[0];
            vm[toolName].selectedVersion = vm[toolName].versionList;
            switch (toolName) {
              case 'oqs-server':
                vm.emailVersionServer = vm[toolName].selectedVersion;
                break;
              case 'oqs-client':
                vm.emailVersionClient = vm[toolName].selectedVersion;
                break;
              case 'oqs-helpdocs':
                vm.emailVersionHelpdocs = vm[toolName].selectedVersion;
                break;
              case 'oqs-apidocs':
                vm.emailVersionApidocs = vm[toolName].selectedVersion;
                break;
              case 'oqs-baseline':
                vm.emailVersionBaseline = vm[toolName].selectedVersion;
                break;
              default:
                break;
            }
            vm.isUpgradeButton = true;
          }
          var toolLogs = allLogs.filter(log => log.toolName === toolName);
          if (toolLogs.length) {
            var latestLog = toolLogs[toolLogs.length - 1];
            if (latestLog.plannedEmail) {
              var plannedEmailSentDate = (latestLog.plannedEmail.sentDate) ? moment(latestLog.plannedEmail.sentDate).format('YYYY-MM-DD, HH:mm') : undefined;
              if (plannedEmailSentDate) {
                // eslint-disable-next-line max-len
                vm[toolName].plannedEmailMessage = `Latest Planned Email was sent: ${plannedEmailSentDate} for version: ${latestLog.upgradeToVersion}`;
              }
            }
          }
          vm.loading = false;
          $scope.$apply();
        });
      });
      getToolInfoReq.on('error', error => {
        console.error(error); // eslint-disable-line no-console
        vm[toolName].upgradeButtonDisabled = true;
      });
      getToolInfoReq.end();
    } catch (requestError) {
      console.log(requestError); // eslint-disable-line no-console
    }
  };

  function clearCurrentValues() {
    vm.commits = '';
    vm.previousCommits = '';
    for (let i = 0; i < vm.tools.length; i += 1) {
      vm[vm.tools[i].name].showcommits = false;
    }
  }

  function disableUpgradeButtons(status) {
    for (let i = 0; i < vm.tools.length; i += 1) {
      vm[vm.tools[i].name].upgradeButtonDisabled = status;
    }
  }

  vm.isUpgrade = function (selectedVer, currentVer) {
    if (selectedVer) var selectedSplit = selectedVer.split(':');
    return (selectedVer) ? semver.gte(selectedSplit[0], currentVer) : true;
  };

  vm.setCommits = async function (tool) {
    clearCurrentValues();
    if (vm.currentTool === tool) {
      vm.currentTool = '';
      return;
    }
    vm.currentTool = tool;
    vm.commits = vm[vm.currentTool].commits;
    vm.previousCommits = vm[vm.currentTool].previousCommits;
    vm[vm.currentTool].showcommits = true;
  };

  vm.showCommitsForCurrentTool = function () {
    if (!vm.currentTool) {
      return false;
    }
    return vm[vm.currentTool].showcommits;
  };

  vm.refreshTerminal = async function () {
    var options = {
      hostname: host,
      port: port,
      path: '/api/getterminaloutput',
      method: 'GET'
    };
    var refreshReq = http.request(options, res => {
      res.on('data', dataReceived => {
        vm.terminal = dataReceived;
        $scope.$apply();
        var elem = document.getElementById('outputs');
        if (elem && elem.scrollHeight) elem.scrollTop = elem.scrollHeight;
        if (dataReceived.includes('PROCESS FINISHED')) {
          clearTimeout(stopRefresh);
        }
      });
    });
    refreshReq.on('error', error => {
      console.error(error); // eslint-disable-line no-console
    });
    refreshReq.end();
    stopRefresh = setTimeout(vm.refreshTerminal, 1500);
  };

  vm.executeUpgrade = async function (tool) {
    vm.upgradingTool = tool;
    vm.currentVersion = vm[tool].currentVersion;
    vm.upgradeVersion = vm[tool].selectedVersion.split(':')[0];
    var upgradeType = (semver.gte(vm.upgradeVersion, vm.currentVersion)) ? 'upgrade' : 'downgrade';
    if ($window.confirm(`Are you sure you want to ${upgradeType} ${vm.upgradingTool} to ${vm.upgradeVersion}?`)) {
      var downgradeWarning = (upgradeType === 'downgrade') ?
        'DOWNGRADE WARNING: Ensure reverted upgrades did NOT include backwards-incompatible changes!\n\nOnly proceed if certain this downgrade will not break the tool!' : '';
      if (!downgradeWarning || $window.confirm(downgradeWarning)) {
        var toolLogs = allLogs.filter(log => log.toolName === tool);
        var upgradeMailFound = toolLogs.some(function (log) {
          return (log.upgradeFromVersion === vm.currentVersion && log.upgradeToVersion === vm.upgradeVersion && !log.completedEmail.sentDate);
        });
        // eslint-disable-next-line max-len
        if (upgradeMailFound || $window.confirm(`${upgradeType.toUpperCase()}-EMAIL NOT FOUND: Ensure a valid ${upgradeType}-email is sent before upgrading the tool!\n\nOnly proceed if certain one was sent!`)) {
          vm.showTerminal = true;
          disableUpgradeButtons(true);
          vm.refreshTerminal();
          vm.terminal = 'PLEASE WAIT';
          var options = {
            hostname: host,
            port: port,
            path: `/api/executeupgrade/${vm.currentVersion}/${vm.upgradeVersion}/${vm.upgradingTool}`,
            method: 'GET'
          };
          var executeReq = http.request(options);
          executeReq.end();
        }
      }
    }
  };

  vm.executeOQSUpgrade = async function () {
    var server = vm['oqs-server'].selectedVersion.split(':')[0];
    var client = vm['oqs-client'].selectedVersion.split(':')[0];
    var helpdocs = vm['oqs-helpdocs'].selectedVersion.split(':')[0];
    var apidocs = vm['oqs-apidocs'].selectedVersion.split(':')[0];
    var baseline = vm['oqs-baseline'].selectedVersion.split(':')[0];
    var serverFrom = vm['oqs-server'].currentVersion.split(':')[0];
    var clientFrom = vm['oqs-client'].currentVersion.split(':')[0];
    var helpdocsFrom = vm['oqs-helpdocs'].currentVersion.split(':')[0];
    var apidocsFrom = vm['oqs-apidocs'].currentVersion.split(':')[0];
    var baselineFrom = vm['oqs-baseline'].currentVersion.split(':')[0];
    if ($window.confirm('Are you sure you want to upgrade/downgrade OQS and have you sent a planned email?')) {
      vm.showTerminal = true;
      disableUpgradeButtons(true);
      vm.refreshTerminal();
      vm.terminal = 'PLEASE WAIT';
      var options = {
        hostname: host,
        port: port,
        path: `/api/executeoqsupgrade/${server}/${client}/${helpdocs}/${apidocs}/
          ${baseline}/${serverFrom}/${clientFrom}/${helpdocsFrom}/${apidocsFrom}/${baselineFrom}`,
        method: 'GET'
      };
      var executeReq = http.request(options);
      executeReq.end();
    }
  };

  async function populateAllToolsInfo() {
    if (vm.tools.length !== 0) {
      await asyncForEach(vm.tools, async function (tool) {
        vm[tool.name] = {};
        vm[tool.name].displayName = tool.toolEmailName;
        await vm.populateToolInfo(tool.name);
      });
    }
  }

  populateAllToolsInfo();

  // Modal for Email
  var modal = document.getElementById('emailModal');
  var span = document.getElementsByClassName('close')[0];

  span.onclick = function () {
    modal.style.display = 'none';
  };

  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };

  vm.getToolSetupEmail = async function (tool) {
    vm.plannedEmail = {};
    if (tool === 'oqs-baseline') {
      vm.isOQS = true;
      vm.useDefaultTime = false;
      vm.plannedEmail.displayName = 'OQS';
    } else {
      vm.useDefaultTime = vm[tool].ci;
      vm.isOQS = false;
      vm.plannedEmail.displayName = vm[tool].displayName;
    }
    vm.emailDate = new Date(vm.getUpgradeTime(tool));
    vm.emailVersion = undefined;
    vm.emailLog = undefined;
    vm.plannedEmail.toolName = tool;
    vm.plannedEmail.recipients = _.cloneDeep(vm[tool].recipients);
    await getContactInfo();
    vm.plannedEmail.comment = '';
    vm.plannedEmail.commits = [];
    _.defer(function () {
      $scope.$apply();
      modal.style.display = 'block';
      $('#email-datetime').focus();
    });
  };
  async function getContactInfo() {
    var emailContactInfo = {};
    if (allContactInfo.length !== 0) {
      var contactInfo = await allContactInfo.find((contact, index) => index === 0);
      var scrumMaster = await allUsers.find(user => user._id === contactInfo.scrumMaster);
      emailContactInfo.SM = {
        name: scrumMaster.displayName,
        other: scrumMaster.email
      };
      var productOwner = await allUsers.find(user => user._id === contactInfo.productOwner);
      emailContactInfo.PO = {
        name: productOwner.displayName,
        other: productOwner.email
      };
      emailContactInfo.Team = {
        name: contactInfo.team,
        other: contactInfo.teamEmail
      };
      emailContactInfo.Jira = {
        name: contactInfo.team + ' - JIRA Template',
        other: contactInfo.jiraTemplateUrl
      };
    }
    vm.emailContactInfo = emailContactInfo;
  }

  vm.checkIfUpgrade = async function (tool) {
    var oqsTools = ['oqs-server', 'oqs-client', 'oqs-helpdocs', 'oqs-apidocs', 'oqs-baseline'];
    if (tool.includes(': n -')) {
      oqsTools.forEach(function (tool2) {
        vm[tool2].versions = vm[tool2].versions.filter(version => !version.includes(': n +'));
      });
      vm.isUpgradeButton = false;
    } else if (tool.includes(': n +')) {
      oqsTools.forEach(function (tool2) {
        vm[tool2].versions = vm[tool2].versions.filter(version => !version.includes(': n -'));
      });
      vm.isUpgradeButton = true;
    }
  };

  vm.getEmailToolCommits = async function (oqsTool) {
    vm.loading = true;
    vm.emailLog = undefined;
    var emailVersion = '';
    var toolName = '';
    var emailVersionWithChange = '';
    switch (oqsTool) {
      case 'oqs-server':
        emailVersionWithChange = vm.emailVersionServer;
        emailVersion = emailVersionWithChange.split(':')[0];
        toolName = oqsTool;
        break;
      case 'oqs-client':
        emailVersionWithChange = vm.emailVersionClient;
        emailVersion = emailVersionWithChange.split(':')[0];
        toolName = oqsTool;
        break;
      case 'oqs-helpdocs':
        emailVersionWithChange = vm.emailVersionHelpdocs;
        emailVersion = emailVersionWithChange.split(':')[0];
        toolName = oqsTool;
        break;
      case 'oqs-apidocs':
        emailVersionWithChange = vm.emailVersionApidocs;
        emailVersion = emailVersionWithChange.split(':')[0];
        toolName = oqsTool;
        break;
      case 'oqs-baseline':
        emailVersionWithChange = vm.emailVersionBaseline;
        emailVersion = emailVersionWithChange.split(':')[0];
        toolName = oqsTool;
        break;
      default:
        emailVersion = vm.emailVersion.split(':')[0];
        toolName = vm.plannedEmail.toolName;
    }
    vm.isRollBack = (semver.gte(emailVersion, vm[toolName].currentVersion)) ? 'to upgrade' : 'to rollback';
    if (vm.isOQS) {
      var oqsTools = ['oqs-server', 'oqs-client', 'oqs-helpdocs', 'oqs-apidocs', 'oqs-baseline'];
      if (emailVersionWithChange.includes(': n -')) {
        oqsTools.forEach(function (tool2) {
          vm[tool2].versions = vm[tool2].versions.filter(a => !a.includes(': n +'));
        });
      } else if (emailVersionWithChange.includes(': n +')) {
        oqsTools.forEach(function (tool2) {
          vm[tool2].versions = vm[tool2].versions.filter(a => !a.includes(': n -'));
        });
      }
    }
    var options = {
      hostname: host,
      port: port,
      path: `/api/getToolCommits/${toolName}/${emailVersion}`,
      method: 'GET'
    };
    var commitReq = await http.request(options, res => {
      res.on('data', dataReceived => {
        var commitsData = JSON.parse(dataReceived);
        vm.loading = false;
        var commits = [];
        if (commitsData.message) {
          commits.push(commitsData);
        } else {
          commits.push(commitsData.commits);
        }
        if (commitsData.log) vm.emailLog = commitsData.log;
        if (commits.length) {
          vm.plannedEmail.commits = [];
          commits.forEach(element => {
            if (element.length) {
              element.forEach(commit => {
                vm.plannedEmail.commits.push(commit);
              });
            }
          });
        }
        $scope.$apply();
      });
    });
    commitReq.on('error', error => {
      vm.loading = false;
      vm.plannedEmail.commits = error;
      console.error(error); // eslint-disable-line no-console
    });
    commitReq.end();
    $scope.$apply();
    vm.loading = false;
  };

  vm.removeEmailCommit = function (commitIndex) {
    if ($window.confirm(`Are you sure you want to remove commit ${commitIndex + 1} from the email?`)) {
      vm.plannedEmail.commits.splice(commitIndex, 1);
    }
  };

  // Email Address functions
  vm.addEmailAddress = function () {
    vm.plannedEmail.recipients.push('');
  };

  vm.removeEmailAddress = function (addressIndex) {
    var address = vm.plannedEmail.recipients[addressIndex];
    if ($window.confirm(`Are you sure you want to remove this email address ${addressIndex + 1}: "${address}"?`)) {
      vm.plannedEmail.recipients.splice(addressIndex, 1);
    }
  };

  vm.sendPlannedEmail = async function () {
    var localISOTime = moment(vm.emailDate).toISOString(true);
    vm.plannedEmail.dateTime = localISOTime;
    vm.plannedEmail.sender = Authentication.user.username;
    vm.plannedEmail.useDefaultTime = vm.useDefaultTime;
    var upgradeType = '';
    if (vm.isOQS) {
      vm.plannedEmail.upgradeFromVersion = {
        server: vm['oqs-server'].currentVersion,
        baseline: vm['oqs-baseline'].currentVersion,
        helpdocs: vm['oqs-helpdocs'].currentVersion,
        apidocs: vm['oqs-apidocs'].currentVersion,
        client: vm['oqs-client'].currentVersion
      };
      vm.plannedEmail.upgradeToVersion = {
        server: vm.emailVersionServer.split(':')[0],
        baseline: vm.emailVersionBaseline.split(':')[0],
        helpdocs: vm.emailVersionHelpdocs.split(':')[0],
        apidocs: vm.emailVersionApidocs.split(':')[0],
        client: vm.emailVersionClient.split(':')[0]
      };
      vm.plannedEmail.isOQS = true;
      // handle No Jira commits
      vm.plannedEmail.commits.forEach(function (commit, index) {
        if (commit.issues.length === 0) {
          commit.issues[0] = {
            issue: `No Jira_${index}`, issueSummary: commit.commitMessage, issueType: 'N/A', issueUrl: 'N/A'
          };
        }
      });

      upgradeType = (vm.isRollBack === 'to upgrade') ? 'upgrade' : 'downgrade';
      vm.plannedEmail.isUpgrade = upgradeType;
    } else {
      vm.plannedEmail.upgradeFromVersion = vm[vm.plannedEmail.toolName].currentVersion;
      vm.plannedEmail.upgradeToVersion = vm.emailVersion.split(':')[0];
      upgradeType = (semver.gte(vm.plannedEmail.upgradeToVersion, vm.plannedEmail.upgradeFromVersion)) ? 'upgrade' : 'downgrade';
    }

    var emailData = JSON.stringify(JSON.parse(angular.toJson(vm.plannedEmail)));
    if (process.env.NODE_ENV === 'production') {
      try {
        vm.loading = true;
        vm.sendingEmail = true;
        // default post header
        $http.defaults.headers.post['Content-Type'] = 'application/json';
        // send login data
        await $http({
          method: 'POST',
          url: '/api/sendEmail/planned',
          data: emailData,
          headers: { 'Content-Type': 'application/json' }
        }).then(function (data) {
          modal.style.display = 'none';
          vm.loading = false;
          vm.sendingEmail = false;
          Notification.success({
            message: `<i class="glyphicon glyphicon-ok"></i> SUCCESS: Sent 'Planned ${upgradeType} Email' for ${vm.plannedEmail.displayName}!`
          });
          vm.emailDate = undefined;
          vm.emailVersion = undefined;
          vm.plannedEmail = {};
          $state.go('home', {}, { reload: 'home' });
        }, function (err) {
          vm.sendingEmail = false;
          vm.loading = false;
          Notification.error({
            message: JSON.stringify(err),
            title: `<i class="glyphicon glyphicon-remove"></i> ERROR:
                    Failed to send 'Planned ${upgradeType} Email' for ${vm.plannedEmail.displayName}!`
          });
        });
      } catch (err) {
        vm.sendingEmail = false;
        vm.loading = false;
        Notification.error({
          message: JSON.stringify(err),
          title: `<i class="glyphicon glyphicon-remove"></i> ERROR: Failed to send 'Planned ${upgradeType} Email' for ${vm.plannedEmail.displayName}!`
        });
      }
    } else {
      Notification.success({
        message: `<i class="glyphicon glyphicon-ok"></i> SUCCESS: Sent 'Planned ${upgradeType} Email' for ${vm.plannedEmail.displayName}!`
      });
      vm.emailDate = undefined;
      vm.emailVersion = undefined;
      vm.plannedEmail = {};
      $state.go('home', {}, { reload: 'home' });
    }
  };

  vm.getUpgradeTime = function (toolName, forInfo) {
    var today = moment();
    // Check if mon-thursday 0-4, set next day. else closest monday
    var correctDay = (today.day() < 4) ? today.add(1, 'days') : today.add(1, 'weeks').startOf('isoWeek');
    switch (toolName) {
      case 'de-object-store':
        return (forInfo) ? '11.00' : moment(correctDay.set({ hour: 11, minute: 0 }));
      case 'booking-tool':
        return (forInfo) ? '10.00' : moment(correctDay.set({ hour: 10, minute: 30 }));
      case 'deployment-inventory-tool':
        return (forInfo) ? '10.30' : moment(correctDay.set({ hour: 10, minute: 0 }));
      case 'CM-Portal':
        return (forInfo) ? '10.45' : moment(correctDay.set({ hour: 10, minute: 45 }));
      case 'oqs-baseline':
        return (forInfo) ? '11.30' : moment(correctDay.set({ hour: 11, minute: 30 }));
      default:
      // do nothing
    }
  };

  vm.emailDateValidator = async function () {
    var dateSelected = moment(vm.emailDate);
    var today = moment();
    vm.furtherThanAWeek = (moment(dateSelected.diff(today, 'days')) > 7);
    if (vm.furtherThanAWeek) {
      Notification.warning({ message: '<i class="glyphicon glyphicon-warning-sign"></i> Warning: Upgrade date selected is more than a week!' });
    }
  };
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
