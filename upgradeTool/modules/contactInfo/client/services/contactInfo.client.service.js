ContactInfoService.$inject = ['$resource', '$log'];
export default function ContactInfoService($resource, $log) {
  var ContactInfo = $resource('/api/contactInfo/:contactInfoId', {
    contactInfoId: '@_id'
  }, {
    update: {
      method: 'PUT'
    }
  });

  angular.extend(ContactInfo.prototype, {
    createOrUpdate: function () {
      var contactInfo = this;
      return createOrUpdate(contactInfo);
    }
  });
  return ContactInfo;

  function createOrUpdate(contactInfo) {
    if (contactInfo._id) {
      return contactInfo.$update(onSuccess, onError);
    }
    return contactInfo.$save(onSuccess, onError);

    function onSuccess() {
    }

    function onError(errorResponse) {
      $log.error(errorResponse.data);
    }
  }
}
