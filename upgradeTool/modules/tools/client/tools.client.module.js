import routes from './config/tools.client.routes';
import menus from './config/tools.client.menus';
import service from './services/tools.client.service';

export const tools = angular
  .module('tools', [])
  .config(routes)
  .run(menus)
  .factory('ToolsService', service)
  .name;
