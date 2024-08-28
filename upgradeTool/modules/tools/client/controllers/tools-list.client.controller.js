import _ from 'lodash';
var $ = require('jquery');
require('datatables')();
require('datatables.net-scroller')(window, $);
var moment = require('moment');

var dataTablesTemplate = require('../../../core/client/json/datatables_template.json');

ToolsListController.$inject = [
  '$state', '$scope', '$http', '$compile', '$window',
  'Notification', 'tools'
];
export default function ToolsListController(
  $state, $scope, $http, $compile, $window,
  Notification, tools
) {
  var table;
  var vm = this;
  vm.tools = tools;
  vm.scrollYheight = '72vh';

  function refreshAllTables() {
    $('#tools-table').each(function () {
      if ($.fn.DataTable.isDataTable(this)) {
        $(this).dataTable().fnDestroy();
      }
    });

    var datatablesConstructor = {
      data: vm.tools,
      order: [[0, 'desc']],
      scrollY: vm.scrollYheight,
      scrollCollapse: true,
      columns: [
        {
          title: 'Name',
          data: null,
          render: function (data) {
            return `${data.name}`;
          }
        },
        {
          title: 'Official Name',
          data: null,
          render: function (data) {
            return `${data.toolEmailName}`;
          }
        },
        {
          title: 'Url',
          data: null,
          render: function (data) {
            return `<a href="https://${data.toolUrl}" target="_blank">${data.toolUrl}</a>`;
          }
        },
        {
          title: 'Repo',
          data: null,
          render: function (data) {
            return `${data.repo}`;
          }
        },
        {
          title: 'Notification Status',
          data: null,
          render: function (data) {
            return `${data.notificationEnabled ? 'Enabled' : 'Disabled' }`;
          }
        },
        {
          title: 'Actions',
          orderable: false,
          searchable: false,
          data: null,
          width: '175px',
          defaultContent: '<button class="view-button btn btn-sm btn-info">View</button>&nbsp;' +
                          '<button class="edit-button btn btn-sm btn-primary">Edit</button>&nbsp;' +
                          '<button class="delete-button btn btn-sm btn-danger">Delete</button>'
        }
      ]
    };

    $('#tools-table').on('click', '.view-button', function (e) {
      e.stopPropagation();
      var tr = $(this).parents('tr');
      var tool = table.api().row(tr).data();
      $state.go('tools.view', { toolId: tool._id });
    });

    $('#tools-table').on('click', '.edit-button', function (e) {
      e.stopPropagation();
      var tr = $(this).parents('tr');
      var tool = table.api().row(tr).data();
      $state.go('tools.edit', { toolId: tool._id });
    });

    $('#tools-table').on('click', '.delete-button', function (e) {
      e.stopPropagation();
      var tr = $(this).parents('tr');
      var row = table.api().row(tr);
      var tool = row.data();
      var displayName = tool.name;
      if ($window.confirm('Are you sure you want to delete this tool "' + displayName + '"?')) {
        tool.$delete()
          .then(successCallback)
          .catch(errorCallback);
      }

      function successCallback() {
        vm.tools.splice(vm.tools.indexOf(tool), 1);
        Notification.success({ message: '<i class="glyphicon glyphicon-ok"></i> tool "' + displayName + '" deleted successfully!' });
        row.remove().draw();
      }

      function errorCallback(res) {
        Notification.error({
          message: res.data.message.replace(/\n/g, '<br/>'),
          title: '<i class="glyphicon glyphicon-remove"></i> tool "' + displayName + '" deletion failed!'
        });
      }
    });

    table = $('#tools-table').dataTable(_.merge(datatablesConstructor, dataTablesTemplate));
    $('#tools-table').DataTable().draw(); // eslint-disable-line new-cap
    $('.dataTables_scrollBody').css('height', vm.scrollYheight);
    _.defer(function () { $scope.$apply(); });
  }

  function filterAllTables(value) {
    $('#tools-table').DataTable().search(value).draw(); // eslint-disable-line new-cap
  }

  $(function () {
    refreshAllTables();
  });

  vm.cloneTools = async function () {
    try {
      // clones tools from gerrit
      await $http({
        method: 'GET',
        url: '/api/cloneTools',
        headers: { 'Content-Type': 'application/json' }
      }).then(function (res) {
        Notification.success({ message: '<i class="glyphicon glyphicon-ok"></i>  Cloning tools complete!' });
      }, function (err) {
        Notification.error({
          message: JSON.stringify(err),
          title: '<i class="glyphicon glyphicon-remove"></i> ERROR: Failed to clone tools from gerrit!'
        });
      });
    } catch (requestError) {
      console.log(requestError); // eslint-disable-line no-console
    }
  };
}
