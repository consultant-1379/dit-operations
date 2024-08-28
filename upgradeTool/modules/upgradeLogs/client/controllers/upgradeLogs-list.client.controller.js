import _ from 'lodash';
var $ = require('jquery');
require('datatables')();
require('datatables.net-scroller')(window, $);
var moment = require('moment');
var dataTablesTemplate = require('../../../core/client/json/datatables_template.json');

logsListController.$inject = [
  '$state', '$window', '$scope', '$compile',
  'Notification', 'allLogs', 'allTools'
];
export default function logsListController(
  $state, $window, $scope, $compile,
  Notification, allLogs, allTools
) {
  var table;
  var vm = this;
  vm.toolName = $state.params.toolName;
  vm.tool = allTools.find(tool => tool.name === vm.toolName);
  vm.toolId = vm.tool._id;
  vm.logsToDisplay = allLogs.filter(log => log.toolName === vm.toolName);
  vm.scrollYheight = '72vh';

  function refreshAllTables() {
    $('#upgradeLogs-table').each(function () {
      if ($.fn.DataTable.isDataTable(this)) {
        $(this).dataTable().fnDestroy();
      }
    });

    var datatablesConstructor = {
      data: vm.logsToDisplay,
      order: [[0, 'desc']],
      scrollY: vm.scrollYheight,
      columns: [
        {
          title: 'ID',
          width: '15%',
          data: null,
          render: function (data) {
            return `<strong>${data._id}</strong>`;
          }
        },
        {
          title: 'Started By',
          width: '20%',
          data: null,
          render: function (data) {
            if (data.userUpgrading) return `<strong>${data.userUpgrading}</strong>`;
          }
        },
        {
          title: 'From Version',
          width: '15%',
          data: null,
          render: function (data) {
            return `<strong>${data.upgradeFromVersion}</strong>`;
          }
        },
        {
          title: 'To Version',
          width: '15%',
          data: null,
          render: function (data) {
            return `<strong>${data.upgradeToVersion}</strong>`;
          }
        },
        {
          title: 'Start Time',
          width: '20%',
          data: null,
          render: function (data) {
            var startTime = (data.startTime) ? moment(data.startTime).format('YYYY-MM-DD, HH:mm') : '-';
            return `<strong>${startTime}</strong>`;
          }
        },
        {
          title: 'End Time',
          width: '20%',
          data: null,
          render: function (data) {
            var endTime = (data.endTime) ? moment(data.endTime).format('YYYY-MM-DD, HH:mm') : '-';
            return `<strong>${endTime}</strong>`;
          }
        },
        {
          title: 'Planned Email',
          width: '20%',
          data: null,
          render: function (data) {
            if (data.plannedEmail.sentDate) {
              var sentTime = moment(data.plannedEmail.sentDate).format('YYYY-MM-DD, HH:mm');
              return `<strong>${sentTime}</strong>`;
            }
            var viewElement = '<div align="center"><i class="fa fa-times-circle fa-2x" style="color:#FF0000;"><div>';
            var compiledView = $compile(viewElement)($scope)[0].outerHTML;
            return `${compiledView}`;
          }
        },
        {
          title: 'Completed Email',
          width: '20%',
          data: null,
          render: function (data) {
            if (data.completedEmail.sentDate) {
              var sentTime = moment(data.completedEmail.sentDate).format('YYYY-MM-DD, HH:mm');
              return `<strong>${sentTime}</strong>`;
            }
            var viewElement = '<div align="center"><i class="fa fa-times-circle fa-2x" style="color:#FF0000;"><div>';
            var compiledView = $compile(viewElement)($scope)[0].outerHTML;
            return `${compiledView}`;
          }
        },
        {
          title: 'Health-Check',
          width: '15%',
          data: null,
          render: function (data) {
            var type = (data.healthCheckSuccessful) ? 'check' : 'times';
            var color = (data.healthCheckSuccessful) ? '#008000' : '#FF0000';
            var viewElement = `<div align="center"><i class="fa fa-${type}-circle fa-2x" style="color:${color};">`;
            var compiledView = $compile(viewElement)($scope)[0].outerHTML;
            return `${compiledView}`;
          }
        },
        {
          title: 'Upgrade',
          width: '15%',
          data: null,
          render: function (data) {
            var type = (data.successful) ? 'check' : 'times';
            var color = (data.successful) ? '#008000' : '#FF0000';
            var viewElement = `<div align="center"><i class="fa fa-${type}-circle fa-2x" style="color:${color};">`;
            var compiledView = $compile(viewElement)($scope)[0].outerHTML;
            return `${compiledView}`;
          }
        },
        {
          title: 'Action',
          width: '140px',
          data: null,
          render: function (data) {
            var viewElement = `<a class="btn btn-sm btn-info" ui-sref="logs.view({ logId: '${data._id}' })" >View</a><div>`;
            var compiledView = $compile(viewElement)($scope)[0].outerHTML;
            var deleteElement = '<a class="delete-button btn btn-sm btn-danger">Delete</a>'; // No compile needed on a non-angular element
            return `${compiledView}&nbsp;${deleteElement}`;
          }
        }
      ]
    };

    $('#upgradeLogs-table').on('click', '.delete-button', function (e) {
      e.stopPropagation();
      var tr = $(this).parents('tr');
      var row = table.api().row(tr);
      var log = row.data();
      var displayId = log._id;
      if ($window.confirm(`Are you sure you want to delete this log ${displayId}?`)) {
        log.$delete()
          .then(successCallback)
          .catch(errorCallback);
      }

      function successCallback() {
        vm.logsToDisplay.splice(vm.logsToDisplay.indexOf(log), 1);
        Notification.success({
          message: `<i class="glyphicon glyphicon-ok"></i> log ${displayId} deleted successfully!`
        });
        row.remove().draw();
      }

      function errorCallback(res) {
        Notification.error({
          message: res.data.message.replace(/\n/g, '<br/>'),
          title: `<i class="glyphicon glyphicon-remove"></i> log ${displayId} deletion failed!`
        });
      }
    });

    table = $('#upgradeLogs-table').dataTable(_.merge(datatablesConstructor, dataTablesTemplate));
    $('#upgradeLogs-table').DataTable().draw(); // eslint-disable-line new-cap
    $('.dataTables_scrollBody').css('height', vm.scrollYheight);
    _.defer(function () { $scope.$apply(); });
  }

  function filterAllTables(value) {
    $('#upgradeLogs-table').DataTable().search(value).draw(); // eslint-disable-line new-cap
  }

  $(function () {
    refreshAllTables();
    $('#filter-field').on('keyup click', () => filterAllTables($('#filter-field').val()));
  });
}
