var $ = require('jquery');
var moment = require('moment');

logsViewController.$inject = ['$state', '$http', 'log', 'allUsers',
  'Authentication', 'Notification', 'allTools'
];
export default function logsViewController(
  $state, $http, log, allUsers,
  Authentication, Notification, allTools
) {
  var vm = this;
  var dateTimeFormat = 'YYYY-MM-DD, HH:mm';
  vm.jiraUrl = 'https://jira-oss.seli.wh.rnd.internal.ericsson.com/browse/';
  vm.log = log;
  vm.tool = allTools.find(tool => tool.name === log.toolName);
  vm.toolId = vm.tool._id;
  vm.consoleOutput = log.consoleOutput;
  vm.startTime = (log.startTime) ? moment(log.startTime).format(dateTimeFormat) : 'None';
  vm.endTime = (log.endTime) ? moment(log.endTime).format(dateTimeFormat) : 'None';
  if (log.plannedEmail.sentDate) {
    vm.plannedEmailSentTime = (log.plannedEmail.sentDate) ? moment(log.plannedEmail.sentDate).format(dateTimeFormat) : undefined;
    vm.plannedEmailSender = allUsers.find(user => user._id === log.plannedEmail.sender_id);
    $('#planned-email-body').ready(function () {
      var plannedEmailContent = log.plannedEmail.content.replace('<img src="cid:unique@ericsson.com"/>', '');
      $('#planned-email-body').html(plannedEmailContent);
    });
  }
  if (log.completedEmail.sentDate) {
    vm.completedEmailSentTime = (log.completedEmail.sentDate) ? moment(log.completedEmail.sentDate).format(dateTimeFormat) : undefined;
    vm.completedEmailSender = allUsers.find(user => user._id === log.completedEmail.sender_id);
    $('#completed-email-body').ready(function () {
      var completedEmailContent = log.completedEmail.content.replace('<img src="cid:unique@ericsson.com"/>', '');
      $('#completed-email-body').html(completedEmailContent);
    });
  }

  vm.sendCompletedEmail = async function () {
    try {
      var emailData = {};
      emailData.toolName = log.toolName;
      emailData.logId = log._id;
      emailData.sender = Authentication.user.username;
      emailData = JSON.stringify(emailData);
      vm.loading = true;
      vm.sendingEmail = true;
      // default post header
      $http.defaults.headers.post['Content-Type'] = 'application/json';
      // send login data
      await $http({
        method: 'POST',
        url: '/api/sendEmail/completed',
        data: emailData,
        headers: { 'Content-Type': 'application/json' }
      }).then(function (data) {
        vm.loading = false;
        vm.sendingEmail = false;
        Notification.success({
          message: '<i class="glyphicon glyphicon-ok"></i> Sending Completed Email successful!'
        });
      }, function (err) {
        vm.sendingEmail = false;
        vm.loading = false;
        Notification.error({
          message: err.toString(),
          title: '<i class="glyphicon glyphicon-remove"></i> Sending Completed Email error!'
        });
      });
    } catch (err) {
      vm.sendingEmail = false;
      vm.loading = false;
      Notification.error({
        message: err.toString(),
        title: '<i class="glyphicon glyphicon-remove"></i> Sending Completed Email error!'
      });
    }
    $state.go('logs.view', { logId: vm.log._id }, { reload: 'logs.view' });
  };
}
