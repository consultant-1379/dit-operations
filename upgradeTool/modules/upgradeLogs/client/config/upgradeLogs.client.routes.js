import ListController from '../controllers/upgradeLogs-list.client.controller';
import ListTemplate from '../views/upgradeLogs-list.client.view.html';
import ViewController from '../controllers/upgradeLogs-view.client.controller';
import ViewTemplate from '../views/upgradeLogs-view.client.view.html';

routeConfig.$inject = ['$stateProvider'];
export default function routeConfig($stateProvider) {
  $stateProvider
    .state('logs', {
      abstract: true,
      url: '/logs',
      template: '<ui-view/>'
    })

    .state('logs.list', {
      url: '/{toolName}',
      template: ListTemplate,
      controller: ListController,
      controllerAs: 'vm',
      resolve: {
        allLogs: getAllLogs,
        allTools: getAllTools
      }
    })
    .state('logs.view', {
      url: '/view/{logId}',
      template: ViewTemplate,
      controller: ViewController,
      controllerAs: 'vm',
      resolve: {
        log: getLog,
        allUsers: getAllUsers,
        allTools: getAllTools
      }
    });
}

getAllLogs.$inject = ['LogsService'];
function getAllLogs(LogsService) {
  return LogsService.query().$promise;
}

getLog.$inject = ['$stateParams', 'LogsService'];
function getLog($stateParams, LogsService) {
  return LogsService.get({
    logId: $stateParams.logId
  }).$promise;
}

getAllUsers.$inject = ['UsersService'];
function getAllUsers(UsersService) {
  return UsersService.query({ fields: '_id,username,displayName,email' }).$promise;
}

getAllTools.$inject = ['ToolsService'];
function getAllTools(ToolsService) {
  return ToolsService.query({ fields: '_id,name,toolEmailName' }).$promise;
}
