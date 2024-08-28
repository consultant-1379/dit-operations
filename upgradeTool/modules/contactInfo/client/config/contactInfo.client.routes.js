import ListController from '../controllers/contactInfo-list.client.controller';
import CreateController from '../controllers/contactInfo-create.client.controller';
import ViewController from '../controllers/contactInfo-view.client.controller';
import ListTemplate from '../views/contactInfo-list.client.view.html';
import CreateTemplate from '../views/contactInfo-create.client.view.html';
import ViewTemplate from '../views/contactInfo-view.client.view.html';

routeConfig.$inject = ['$stateProvider'];
export default function routeConfig($stateProvider) {
  $stateProvider
    .state('contactInfo', {
      abstract: true,
      url: '/contactInfo',
      template: '<ui-view/>'
    })
    .state('contactInfo.list', {
      url: '',
      template: ListTemplate,
      controller: ListController,
      controllerAs: 'vm',
      resolve: {
        allContactInfo: getAllContactInfo,
        allUsers: ['UsersService', getAllUsersStripped]
      }
    })
    .state('contactInfo.create', {
      url: '/create?{restoreData:json}',
      template: CreateTemplate,
      controller: CreateController,
      controllerAs: 'vm',
      resolve: {
        contactInfo: newContactInfo,
        allUsers: getAllUsers,
        restoredata: getRestoreData,
        creatingFromScratch: function () { return true; }
      }
    })
    .state('contactInfo.edit', {
      url: '/edit/{contactInfoId}?{restoreData:json}',
      template: CreateTemplate,
      controller: CreateController,
      controllerAs: 'vm',
      resolve: {
        contactInfo: getContactInfo,
        allUsers: getAllUsers,
        restoredata: getRestoreData,
        creatingFromScratch: function () { return false; }
      }
    })
    .state('contactInfo.view', {
      url: '/view/{contactInfoId}',
      template: ViewTemplate,
      controller: ViewController,
      controllerAs: 'vm',
      resolve: {
        contactInfo: getContactInfo,
        allUsers: ['UsersService', getAllUsersStripped]
      }
    });
}

getRestoreData.$inject = ['$stateParams'];
function getRestoreData($stateParams) {
  return $stateParams.restoreData;
}

getContactInfo.$inject = ['$stateParams', 'ContactInfoService'];
function getContactInfo($stateParams, ContactInfoService) {
  return ContactInfoService.get({
    contactInfoId: $stateParams.contactInfoId
  }).$promise;
}

getAllContactInfo.$inject = ['ContactInfoService'];
function getAllContactInfo(ContactInfoService) {
  return ContactInfoService.query().$promise;
}

newContactInfo.$inject = ['ContactInfoService'];
function newContactInfo(ContactInfoService) {
  return new ContactInfoService();
}

getAllUsers.$inject = ['UsersService'];
function getAllUsers(UsersService) {
  return UsersService.query().$promise;
}

function getAllUsersStripped(UsersService) {
  return UsersService.query({ fields: '_id,displayName' }).$promise;
}
