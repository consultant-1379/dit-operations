var $ = require('jquery');

HeaderController.$inject = ['$scope', 'Authentication', 'menuService', '$http'];
export default function HeaderController($scope, Authentication, menuService, $http) {
  var vm = this;
  vm.isDevelopment = (env === 'development') ? 'DEV ' : 'LIVE'; // eslint-disable-line no-undef
  vm.accountMenu = menuService.getMenu('account').items[0];
  vm.authentication = Authentication;
  vm.isCollapsed = false;
  vm.menu = menuService.getMenu('topbar');

  $http.get('/api/version')
    .then(function (response) {
      vm.version = response.data;
    });

  $scope.$on('$stateChangeSuccess', stateChangeSuccess);
  function stateChangeSuccess() {
    // Collapsing the menu after navigation
    vm.isCollapsed = false;
  }
  $scope.navbarActive = false;
  if (vm.authentication.user) {
    $scope.navbarActive = true;
  }

  $scope.showNavBar = function (status) {
    $scope.navbarActive = status;
  };

  vm.navbarToggle = function () {
    if ($('#navbar-toggle').is(':visible')) vm.isCollapsed = !vm.isCollapsed;
  };
}
