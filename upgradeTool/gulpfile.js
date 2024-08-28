'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  fs = require('fs'),
  gulp = require('gulp'),
  gulpLoadPlugins = require('gulp-load-plugins'),
  jsonMerger = require('gulp-merge-json'),
  KarmaServer = require('karma').Server,
  testAssets = require('./config/assets/test'),
  config = require('./config/config.js'),
  mongoose = require('./config/lib/mongoose.js'),
  plugins = gulpLoadPlugins(),
  logger = require(path.resolve('./config/lib/logger')),
  docUpgrade = false;


// Set NODE_ENV to 'test'
gulp.task('env:test', function (done) {
  process.env.NODE_ENV = 'test';
  done();
});

// Set NODE_ENV to 'development'
gulp.task('env:dev', function (done) {
  process.env.NODE_ENV = 'development';
  done();
});

// Set NODE_ENV to 'production'
gulp.task('env:prod', function (done) {
  process.env.NODE_ENV = 'production';
  done();
});

// Mocha tests task
gulp.task('mocha', function (done) {
  var testSuites;
  // Open mongoose connections
  if (docUpgrade) {
    testSuites = testAssets.tests.doc_upgrade;
  } else {
    testSuites = testAssets.tests.server;
  }
  var error;

  // Connect mongoose
  mongoose.connect(config.dbMean, function () {
    // Run the tests
    gulp.src(testSuites)
      .pipe(plugins.mocha({
        reporter: 'spec',
        timeout: 10000
      }))
      .on('error', function (err) {
        // If an error occurs, save it
        error = err;
        logger.error(err);
      })
      .on('end', async function () {
        if (process.env.NODE_ENV === 'development') {
          await updateCoverageMinimums();
        }
        // When the tests are done, connect to & clear the logging Db,
        // then disconnect from mongoose & pass any error state back to gulp
        mongoose.connect(config.dbLogging, function (dbLogging) {
          dbLogging.db.dropDatabase(function () {
            mongoose.disconnect(function () {
              done(error);
              if (error) process.exit(1);
              process.exit(0);
            });
          });
        });
      });
  });
});

// Karma test runner task
gulp.task('karma', function (done) {
  new KarmaServer({
    configFile: path.join(__dirname, '/karma.conf.js')
  }, done).start();
});

// Drops the MongoDB Mean database, used in e2e testing
gulp.task('dropMeanDb', function (done) {
  // Use mongoose configuration
  mongoose.connect(config.dbMean, function (dbMean) {
    dbMean.db.dropDatabase(function (err) {
      if (err) logger.error(err);
      else logger.info('Successfully dropped db: ', dbMean.db.databaseName);
      dbMean.db.close(done);
    });
  });
});

// Drops the MongoDB Logging database, used in e2e testing
gulp.task('dropLoggingDb', function (done) {
  // Use mongoose configuration
  mongoose.connect(config.dbLogging, function (dbLogging) {
    dbLogging.db.dropDatabase(function (err) {
      if (err) logger.error(err);
      else logger.info('Successfully dropped db: ', dbLogging.db.databaseName);
      dbLogging.db.close(done);
    });
  });
});

gulp.task('pre_doc_upgrade', function (done) {
  docUpgrade = true;
  done();
});

async function updateCoverageMinimums() {
  var metricTypes = ['lines', 'functions', 'branches', 'statements'];
  console.log('Updating code coverage percentages...'); // eslint-disable-line no-console
  var packageJson = JSON.parse(await fs.readFileSync('./package.json', 'utf-8'));
  var nycJson = JSON.parse(await fs.readFileSync('./coverage/coverage-summary.json'), 'utf-8');
  for (var i = 0; i < metricTypes.length; i += 1) {
    if (parseFloat(packageJson.nyc[metricTypes[i]]) < parseFloat(nycJson.total[metricTypes[i]].pct)) {
      packageJson.nyc[metricTypes[i]] = parseFloat(nycJson.total[metricTypes[i]].pct);
    }
  }
  await fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  console.log('Code coverage percentages updated.'); // eslint-disable-line no-console
}

gulp.task('test:server', gulp.series('env:test', 'dropMeanDb', 'dropLoggingDb', 'mocha'));

gulp.task('test:update_coverage', gulp.series('env:dev', 'dropMeanDb', 'dropLoggingDb', 'mocha'));

gulp.task('test:client', gulp.series('env:test', 'dropMeanDb', 'dropLoggingDb', 'karma'));

gulp.task('test:doc_upgrade', gulp.series('pre_doc_upgrade', 'env:test', 'mocha'));
