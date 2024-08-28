LogsService.$inject = ['$resource', '$log'];
export default function LogsService($resource, $log) {
  var Log = $resource('/api/logs/:logId', {
    logId: '@_id'
  });
  return Log;
}
