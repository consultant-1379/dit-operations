var authRoutes = require('../../modules/users/server/routes/auth.server.routes.js');
var logsRoutes = require('../../modules/upgradeLogs/server/routes/upgradeLogs.server.routes.js');
var contactInfoRoutes = require('../../modules/contactInfo/server/routes/contactInfo.server.routes.js');
var toolsRoutes = require('../../modules/tools/server/routes/tools.server.routes.js');
var coreRoutes = require('../../modules/core/server/routes/core.server.routes.js');

module.exports = [
  authRoutes,
  logsRoutes,
  toolsRoutes,
  contactInfoRoutes,
  coreRoutes
];
