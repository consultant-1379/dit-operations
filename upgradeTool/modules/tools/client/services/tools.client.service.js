ToolsService.$inject = ['$resource', '$log'];
export default function ToolsService($resource, $log) {
  var Tool = $resource('/api/tools/:toolId', {
    toolId: '@_id'
  }, {
    update: {
      method: 'PUT'
    }
  });

  angular.extend(Tool.prototype, {
    createOrUpdate: function () {
      var tool = this;
      return createOrUpdate(tool);
    }
  });
  return Tool;

  function createOrUpdate(tool) {
    if (tool._id) {
      return tool.$update(onSuccess, onError);
    }
    return tool.$save(onSuccess, onError);

    function onSuccess() {
    }

    function onError(errorResponse) {
      $log.error(errorResponse.data);
    }
  }
}
