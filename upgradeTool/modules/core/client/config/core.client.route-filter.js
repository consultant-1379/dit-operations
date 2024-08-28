routeFilter.$inject = ['$rootScope', '$state', 'Authentication', '$transitions', 'Notification'];
export default function routeFilter($rootScope, $state, Authentication, $transitions, Notification) {
  // Used to indicate to the UI that the page is transitioning so that loading screens can appear
  var superAdminPages = ['users.list', 'users.create'];
  var adminPages = [];

  $transitions.onError({}, function () {
    $rootScope.transitioning = false;
  });

  $transitions.onBefore({}, function (trans) {
    if (trans.to().name !== 'authentication.signin') {
      var userLoggedIn = (Authentication.user) ? Authentication.user.roles[0] : undefined;
      if (!userLoggedIn) {
        $state.previous = {
          to: Object.assign({}, trans.to()),
          params: Object.assign({}, trans.params())
        };
        return trans.router.stateService.target('authentication.signin');
      }
      var invalidPermissions;
      if (adminPages.indexOf(trans.to().name) !== -1 && (userLoggedIn !== 'superAdmin' && userLoggedIn !== 'admin')) {
        invalidPermissions = true;
      } else if (superAdminPages.indexOf(trans.to().name) !== -1 && userLoggedIn !== 'superAdmin') {
        invalidPermissions = true;
      }
      if (invalidPermissions) {
        Notification.error({
          title: '<i class="glyphicon glyphicon-remove"></i>Unauthorized!',
          message: 'You do not have valid permissions to access this page.'
        });
        return trans.router.stateService.target('home');
      }
    }
  });

  $transitions.onStart({}, function (trans) {
    $rootScope.transitioning = true;
  });

  $transitions.onSuccess({}, function (trans) {
    $rootScope.transitioning = false;
  });
}
