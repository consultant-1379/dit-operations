import routes from './config/users.client.routes';
import UsersService from './services/users.client.service';
import AuthenticationService from './services/authentication.client.service';
import AuthenticationController from './controllers/authentication.client.controller.js';
import lowercase from './directives/lowercase.client.directive';

export const users = angular
  .module('users', [])
  .config(routes)
  .factory('UsersService', UsersService)
  .factory('Authentication', AuthenticationService)
  .controller('AuthenticationController', AuthenticationController)
  .directive('lowercase', lowercase)
  .name;
