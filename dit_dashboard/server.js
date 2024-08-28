const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express()

app.use(express.static('public'));
app.use(express.static('views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')
const { exec } = require('child_process');

app.get('/', function (req, res) {
  let url = 'http://atvdit.athtem.eei.ericsson.se/api/version'
  request(url, function (error, response, body) {
    var reqIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('Request recieved from ' + reqIP)
    console.log('Gathering information...')
    let currentVersion = `deployment-inventory-tool-${body}`;
    var queryString = 'cd deployment-inventory-tool && echo "$(git log ' + currentVersion.trim() + '..HEAD --pretty=format:"%h, %>(15,trunc)%aN, %>(15,trunc)%cr, %<(140,trunc)%s" --abbrev-commit)"';
    exec('cd deployment-inventory-tool && git fetch origin && git reset --hard origin/master', () => {
      exec(queryString, (err, commits) => {
        exec('cd deployment-inventory-tool && git describe', (err, mergedVersion) => {
          exec('cd deployment-inventory-tool && git log ' + currentVersion.trim() + ' --pretty=format:"%h, %>(15,trunc)%aN, %>(15,trunc)%cr, %<(140,trunc)%s" --abbrev-commit', (err, changelog) => {
            if (!commits.trim()) { commits = 'All Commits Released.' }
            console.log('All information obtained: \nCurrent Version: ' + currentVersion + '\nMerged Version: ' + mergedVersion)
            res.render('index', { currentVersion: currentVersion.split('-')[3], commits: commits.trim().replace(/.*ENM_Jenkins.*/, '') || 'All Released', mergedVersion: mergedVersion.split('-')[3], changelog: changelog, error: null });
          });
        });
      });
    });
  });
});

app.get('/graph', function (req, res) {
  res.render('out', { error: null });
});

app.get('/stats', function (req, res) {
  res.render('general', { error: null });
});

app.get('/statsPage', function (req, res) {
  res.render('statsPage', { error: null });
});

app.listen(4000, '0.0.0.0', function () {
  console.log('DIT Dashboard Running...')
});