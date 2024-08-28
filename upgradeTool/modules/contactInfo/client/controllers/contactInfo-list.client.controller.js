import _ from 'lodash';
var $ = require('jquery');
require('datatables')();
require('datatables.net-scroller')(window, $);
var moment = require('moment');

var dataTablesTemplate = require('../../../core/client/json/datatables_template.json');

ContactInfoListController.$inject = [
  '$state', '$scope', '$http', '$compile', '$window',
  'Notification', 'allContactInfo', 'allUsers'
];
export default function ContactInfoListController(
  $state, $scope, $http, $compile, $window,
  Notification, allContactInfo, allUsers
) {
  var table;
  var vm = this;
  vm.allContactInfo = allContactInfo;
  vm.scrollYheight = '72vh';

  function getNameFromId(userId) {
    return allUsers.filter(user => user._id === userId)[0].displayName;
  }

  function refreshAllTables() {
    $('#contactInfo-table').each(function () {
      if ($.fn.DataTable.isDataTable(this)) {
        $(this).dataTable().fnDestroy();
      }
    });

    var datatablesConstructor = {
      data: vm.allContactInfo,
      order: [[0, 'desc']],
      scrollY: vm.scrollYheight,
      columns: [
        {
          title: 'Team',
          data: null,
          render: function (data) {
            return `<strong>${data.team}</strong>`;
          }
        },
        {
          title: 'Scrum Master',
          data: null,
          render: function (data) {
            return `<strong>${getNameFromId(data.scrumMaster)}</strong>`;
          }
        },
        {
          title: 'Product Owner',
          data: null,
          render: function (data) {
            return `<strong>${getNameFromId(data.productOwner)}</strong>`;
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

    $('#contactInfo-table').on('click', '.view-button', function (e) {
      e.stopPropagation();
      var tr = $(this).parents('tr');
      var contactInfo = table.api().row(tr).data();
      $state.go('contactInfo.view', { contactInfoId: contactInfo._id });
    });

    $('#contactInfo-table').on('click', '.edit-button', function (e) {
      e.stopPropagation();
      var tr = $(this).parents('tr');
      var contactInfo = table.api().row(tr).data();
      $state.go('contactInfo.edit', { contactInfoId: contactInfo._id });
    });

    $('#contactInfo-table').on('click', '.delete-button', function (e) {
      e.stopPropagation();
      var tr = $(this).parents('tr');
      var row = table.api().row(tr);
      var contactInfo = row.data();
      var displayName = contactInfo.team;
      if ($window.confirm('Are you sure you want to delete this contact information "' + displayName + '"?')) {
        contactInfo.$delete().then(successCallback).catch(errorCallback);
      }

      function successCallback() {
        vm.allContactInfo.splice(vm.allContactInfo.indexOf(contactInfo), 1);
        Notification.success({ message: '<i class="glyphicon glyphicon-ok"></i> contact information "' + displayName + '" deleted successfully!' });
        row.remove().draw();
      }

      function errorCallback(res) {
        Notification.error({
          message: res.data.message.replace(/\n/g, '<br/>'),
          title: '<i class="glyphicon glyphicon-remove"></i> contact information "' + displayName + '" deletion failed!'
        });
      }
    });

    table = $('#contactInfo-table').dataTable(_.merge(datatablesConstructor, dataTablesTemplate));
    $('#contactInfo-table').DataTable().draw(); // eslint-disable-line new-cap
    $('.dataTables_scrollBody').css('height', vm.scrollYheight);
    _.defer(function () { $scope.$apply(); });
  }

  function filterAllTables(value) {
    $('#contactInfo-table').DataTable().search(value).draw(); // eslint-disable-line new-cap
  }

  $(function () {
    refreshAllTables();
  });
}
