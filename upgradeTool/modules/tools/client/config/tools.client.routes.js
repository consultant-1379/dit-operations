import ListController from '../controllers/tools-list.client.controller';
import CreateController from '../controllers/tools-create.client.controller';
import ViewController from '../controllers/tools-view.client.controller';
import ListTemplate from '../views/tools-list.client.view.html';
import CreateTemplate from '../views/tools-create.client.view.html';
import ViewTemplate from '../views/tools-view.client.view.html';

routeConfig.$inject = ['$stateProvider'];
export default function routeConfig($stateProvider) {
  $stateProvider
    .state('tools', {
      abstract: true,
      url: '/tools',
      template: '<ui-view/>'
    })
    .state('tools.list', {
      url: '',
      template: ListTemplate,
      controller: ListController,
      controllerAs: 'vm',
      resolve: {
        tools: getTools
      }
    })
    .state('tools.create', {
      url: '/create?{restoreData:json}',
      template: CreateTemplate,
      controller: CreateController,
      controllerAs: 'vm',
      resolve: {
        tool: newTool,
        restoredata: getRestoreData,
        creatingFromScratch: function () { return true; }
      }
    })
    .state('tools.edit', {
      url: '/edit/{toolId}?{restoreData:json}',
      template: CreateTemplate,
      controller: CreateController,
      controllerAs: 'vm',
      resolve: {
        tool: getTool,
        restoredata: getRestoreData,
        creatingFromScratch: function () { return false; }
      }
    })
    .state('tools.view', {
      url: '/view/{toolId}',
      template: ViewTemplate,
      controller: ViewController,
      controllerAs: 'vm',
      resolve: {
        tool: getTool
      }
    });
}

getRestoreData.$inject = ['$stateParams'];
function getRestoreData($stateParams) {
  return $stateParams.restoreData;
}

getTool.$inject = ['$stateParams', 'ToolsService'];
function getTool($stateParams, ToolsService) {
  return ToolsService.get({
    toolId: $stateParams.toolId
  }).$promise;
}

getTools.$inject = ['ToolsService'];
function getTools(ToolsService) {
  return ToolsService.query().$promise;
}

newTool.$inject = ['ToolsService'];
function newTool(ToolsService) {
  return new ToolsService();
}
