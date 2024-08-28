'use strict';

var mongoose = require('mongoose');
var MongooseSchema = mongoose.Schema;

var Tool = new MongooseSchema({
  name: {
    type: String,
    trim: true,
    unique: true,
    required: true
  },
  toolEmailName: {
    type: String,
    trim: true,
    required: true
  },
  toolUrl: {
    type: String,
    trim: true,
    required: true
  },
  repo: {
    type: String,
    trim: true,
    required: true
  },
  folderPath: {
    type: String,
    trim: true,
    required: true
  },
  changeLogUrl: {
    type: String,
    trim: true,
    required: true
  },
  recipients: [{
    type: String,
    trim: true
  }],
  ci: {
    type: Boolean,
    default: false
  },
  currentVersion: {
    type: String
  },
  mergedVersion: {
    type: String
  },
  upgradeDate: {
    type: Date
  },
  needsToBeUpgraded: {
    type: Boolean,
    default: false
  },
  plannedUpgradeEmailSent: {
    type: Boolean,
    default: false
  },
  notifications: {
    type: String,
    default: ''
  },
  notificationJira: {
    type: String,
    default: ''
  },
  notificationEnabled: {
    type: Boolean,
    default: false
  },
  notificationStart: {
    type: Date
  },
  notificationEnd: {
    type: Date
  },
  autoRemoveNotification: {
    type: Date
  },
  grafanaDashboardUrl: {
    type: String,
    trim: true
  }
}, { strict: 'throw' });

module.exports.Schema = mongoose.model('Tool', Tool);
