'use strict';

// Root routing
var core = require('../controllers/core.server.controller');

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.sendStatus(401);
  }
}

module.exports = function (app) {
  // GET
  app.route('/api/logintest').get(checkAuthenticated, core.loginTest);
  app.route('/api/version').get(core.getVersion);
  app.route('/api/cloneTools').get(core.cloneTools);
  app.route('/api/toolinfo/:tool').get(core.getToolInfo);
  app.route('/api/toolnotifications/:tool').get(core.getToolNotifications);
  app.route('/api/executeupgrade/:currentVersion/:newVersion/:tool').get(core.executeUpgrade);
  app.route('/api/executeoqsupgrade/:server/:client/:helpdocs/:apidocs/:baseline/:serverFrom/:clientFrom/:helpdocsFrom/:apidocsFrom/:baselineFrom')
    .get(core.executeOQSUpgrade);
  app.route('/api/getterminaloutput').get(core.getTerminalOutput);

  app.route('/api/getToolCommits/:tool/:version').get(core.getToolCommits);
  app.route('/api/jiraIssueValidation/:issue').get(core.jiraIssueValidation);

  // Return a 404 for all undefined api, module or lib routes
  app.route('/:url(api|modules|lib)/*').get(core.renderNotFound);

  // Define application route
  app.route('/*').get(core.renderIndex);

  // POST
  app.route('/api/sendEmail/:emailType').post(core.sendToolEmail);

  // PUT
  app.route('/api/updateToolCi/:toolId').put(core.updateToolCi);
};
