var helperHandler = require('../../../core/client/controllers/helpers.client.controller');

ToolsViewController.$inject = ['$scope', '$state', 'tool'];
export default function ToolsViewController($scope, $state, tool) {
  var vm = this;
  vm.tool = helperHandler.notificationUpdateHandler(tool);
}
