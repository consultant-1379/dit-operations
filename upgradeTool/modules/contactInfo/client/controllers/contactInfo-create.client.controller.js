ContactInfoCreateController.$inject = ['$scope', '$state', '$window',
  'contactInfo', 'allUsers', 'Notification', 'restoredata',
  'creatingFromScratch'];

export default function ContactInfoCreateController(
  $scope, $state, $window, contactInfo, allUsers, Notification,
  restoredata, creatingFromScratch
) {
  var vm = this;
  vm.contactInfo = contactInfo;
  vm.users = allUsers;

  if (restoredata) {
    Object.keys(restoredata).forEach(function (key) {
      vm.contactInfo[key] = restoredata[key];
    });
  }

  if (creatingFromScratch && !restoredata) {
    vm.pageTitle = 'Creating Contact Information';
  } else {
    vm.pageTitle = (restoredata) ? 'Restoring Contact Information' : 'Editing Contact Information';
  }

  vm.submitForm = async function () {
    try {
      vm.formSubmitting = true;
      await vm.contactInfo.createOrUpdate();
    } catch (err) {
      vm.formSubmitting = false;
      Notification.error({ message: err.data.message.replace(/\n/g, '<br/>'), title: '<i class="glyphicon glyphicon-remove"></i> contact information creation error!' });
      return;
    }

    $state.go('contactInfo.view', { contactInfoId: vm.contactInfo._id });
    if (creatingFromScratch && !restoredata) {
      Notification.success({ message: '<i class="glyphicon glyphicon-ok"></i> contact information creation successful!' });
    } else {
      Notification.success({ message: '<i class="glyphicon glyphicon-ok"></i> contact information updated successfully!' });
    }
  };

  if (restoredata) {
    vm.submitForm();
  }
}
