ContactInfoViewController.$inject = ['$scope', '$state', 'contactInfo', 'allUsers'];
export default function ContactInfoViewController($scope, $state, contactInfo, allUsers) {
  var vm = this;
  vm.contactInfo = contactInfo;
  vm.scrumMaster = allUsers.find(user => user._id === vm.contactInfo.scrumMaster);
  vm.productOwner = allUsers.find(user => user._id === vm.contactInfo.productOwner);
}
