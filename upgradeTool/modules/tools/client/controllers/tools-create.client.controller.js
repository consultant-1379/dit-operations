import _ from 'lodash';
var moment = require('moment');

ToolsCreateController.$inject = ['$scope', '$state', '$window', '$http', 'tool',
  'Notification', 'restoredata', 'creatingFromScratch'];

export default function ToolsCreateController(
  $scope, $state, $window, $http, tool, Notification,
  restoredata, creatingFromScratch
) {
  var vm = this;
  vm.tool = tool;
  if (vm.tool.notificationStart && vm.tool.notificationEnd) {
    vm.tool.notificationStart = new Date(moment(vm.tool.notificationStart).format('YYYY-MM-DDTHH:mm'));
    vm.tool.notificationEnd = new Date(moment(vm.tool.notificationEnd).format('YYYY-MM-DDTHH:mm'));
  }
  if (!vm.tool.recipients || vm.tool.recipients.length === 0) {
    vm.tool.recipients = [];
  }

  if (restoredata) {
    Object.keys(restoredata).forEach(function (key) {
      vm.tool[key] = restoredata[key];
    });
  }

  if (creatingFromScratch && !restoredata) {
    vm.pageTitle = 'Creating tool';
  } else {
    vm.pageTitle = (restoredata) ? 'Restoring tool' : 'Editing tool';
  }

  vm.addRecipientEmail = function () {
    vm.tool.recipients.push('');
  };

  vm.removeRecipientEmail = function (recipientEmailIndex) {
    var recipientEmail = vm.tool.recipients[recipientEmailIndex];
    if ($window.confirm(`Are you sure you want to remove this Recipient Email ${recipientEmailIndex + 1}: "${recipientEmail}"?`)) {
      vm.tool.recipients.splice(recipientEmailIndex, 1);
    }
  };

  vm.jiraIssueValidation = function (jiraIssue) {
    vm.tool.notificationEnabled = false;
    if (jiraIssue) {
      $http({
        method: 'GET',
        url: `/api/jiraIssueValidation/${jiraIssue}`
      }).then(function successCallback(response) {
        if (response.data.valid === true) {
          if (!response.data.status.includes('Closed')) vm.tool.notificationEnabled = true;
          Notification.success({ message: `<i class="glyphicon glyphicon-ok"></i> JIRA Issue: ${jiraIssue} is valid` });
          $scope.form.notificationJira.$setValidity('jiraValidation', true);
        } else if (response.data.valid === false) {
          Notification.error({
            message: response.data.errorMessages.join(', '),
            title: `<i class="glyphicon glyphicon-remove"></i> JIRA Issue: ${jiraIssue} is invalid`
          });
          if (response.data.errorMessages.includes('Issue Does Not Exist')) {
            $scope.form.notificationJira.$setValidity('jiraValidation', false);
          }
        } else {
          Notification.error({
            message: JSON.stringify(response.data.errorMessage),
            title: `<i class="glyphicon glyphicon-remove"></i> An error occurred while checking the JIRA Issue: ${jiraIssue}`
          });
        }
      }, function errorCallback(response) {
        Notification.error({
          message: JSON.stringify(response),
          title: `<i class="glyphicon glyphicon-remove"></i> An error occurred while checking the JIRA Issue: ${jiraIssue}`
        });
      });
    }
    _.defer(() => $scope.$apply());
  };

  vm.submitForm = async function () {
    try {
      vm.formSubmitting = true;
      await vm.tool.createOrUpdate();
    } catch (err) {
      vm.formSubmitting = false;
      Notification.error({ message: err.data.message.replace(/\n/g, '<br/>'), title: '<i class="glyphicon glyphicon-remove"></i> tool creation error!' });
      return;
    }
    $state.go('tools.view', { toolId: vm.tool._id });
    if (creatingFromScratch && !restoredata) {
      Notification.success({ message: '<i class="glyphicon glyphicon-ok"></i> tool creation successful!' });
    } else {
      Notification.success({ message: '<i class="glyphicon glyphicon-ok"></i> tool updated successfully!' });
    }
  };

  if (restoredata) {
    vm.submitForm();
  }
}
