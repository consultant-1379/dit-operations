module.exports.isValidSearch = function (query) {
  for (var key in query) {
    if (key !== 'fields' && key !== 'q') {
      return false;
    } else if (!query[key]) {
      return false;
    }
  }
  return true;
};
