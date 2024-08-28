import routes from './config/upgradeLogs.client.routes';
import service from './services/upgradeLogs.client.service';

export const logs = angular
  .module('logs', [])
  .config(routes)
  .factory('LogsService', service)
  .name;
