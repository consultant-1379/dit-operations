import uiNotification from 'angular-ui-notification';
import routes from './config/core.client.routes';
import menus from './config/core.client.menus';
import routeFilter from './config/core.client.route-filter';
import headerCtrl from './controllers/header.client.controller';
import errorCtrl from './controllers/error.client.controller';
import menuService from './services/menu.client.service.js';
import authInterceptor from './services/interceptors/auth-interceptor.client.service';
import httpLoading from './directives/http-loading.client.directive';
import uiNotificationConfig from './config/ui.notification.js';
import headerView from './directives/header-view.client.directive';
import 'angular-bootstrap-toggle';
import 'angular-bootstrap-toggle/dist/angular-bootstrap-toggle.min.css';
import '../../../node_modules/angular-ui-notification/dist/angular-ui-notification.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './css/assets.css';
import './css/bootstrap.css';
import './css/core.css';
import './css/systemBar.css';
import './img/brand/favicon.ico';
import '../../../node_modules/pretty-checkbox/dist/pretty-checkbox.min.css';

export const core = angular
  .module('core', ['ui-notification'])
  .config(routes)
  .config(uiNotificationConfig)
  .run(menus)
  .run(routeFilter)
  .controller('HeaderController', headerCtrl)
  .controller('ErrorController', errorCtrl)
  .factory('menuService', menuService)
  .factory('authInterceptor', authInterceptor)
  .directive('httpLoading', httpLoading)
  .directive('headerView', headerView)
  .name;
