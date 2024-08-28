import authenticationController from '../controllers/authentication.client.controller';
import authenticationView from '../views/authentication/authentication.client.view.html';
import signInView from '../views/authentication/signin.client.view.html';
routeConfig.$inject = ['$stateProvider'];

export default function routeConfig($stateProvider) {
  $stateProvider
    .state('authentication', {
      abstract: true,
      url: '/authentication',
      template: authenticationView,
      controller: authenticationController,
      controllerAs: 'vm'
    })
    .state('authentication.signin', {
      url: '/signin?err',
      template: signInView,
      controller: authenticationController,
      controllerAs: 'vm'
    });
}
