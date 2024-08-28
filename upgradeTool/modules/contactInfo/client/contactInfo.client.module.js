import routes from './config/contactInfo.client.routes';
import menus from './config/contactInfo.client.menus';
import service from './services/contactInfo.client.service';

export const contactInfo = angular
  .module('contactInfo', [])
  .config(routes)
  .run(menus)
  .factory('ContactInfoService', service)
  .name;
