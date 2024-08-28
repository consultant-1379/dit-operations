var moment = require('moment');

export async function asyncForEach(array, callBack) {
  for (var i = 0; i < array.length; i += 1) {
    await callBack(array[i], i, array); //eslint-disable-line
  }
}

export function dateTimeFormat(dateTime) {
  return moment(dateTime).format('DD-MM-YYYY HH:mm');
}

export function notificationUpdateHandler(tool) {
  var currentTime = moment();
  tool.notificationStart = tool.notificationStart ? dateTimeFormat(tool.notificationStart) : 'None';
  tool.notificationEnd = tool.notificationEnd ? dateTimeFormat(tool.notificationEnd) : 'None';
  tool.notificationJira = tool.notificationJira || 'None';
  tool.notifications = tool.notifications || 'None';
  var removalHours = tool.autoRemoveNotification ? moment(tool.autoRemoveNotification).diff(currentTime, 'hours') : undefined;
  tool.autoRemoveNotification = (removalHours) ? `${removalHours} Hours` : 'None';
  return tool;
}
