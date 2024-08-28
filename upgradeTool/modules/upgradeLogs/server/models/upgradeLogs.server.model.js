'use strict';

var mongoose = require('mongoose');
var MongooseSchema = mongoose.Schema;
var User = require('../../../users/server/models/user.server.model.js').Schema;

var jiraSchema = new MongooseSchema({
  _id: false,
  issue: {
    type: String,
    default: ''
  },
  issueType: {
    type: String,
    default: ''
  },
  issueSummary: {
    type: String,
    default: ''
  },
  comment: {
    type: String,
    default: ''
  }
}, { strict: 'throw' });

var commitSchema = new MongooseSchema({
  _id: false,
  commitUser: {
    type: String,
    required: true
  },
  commitMessage: {
    type: String,
    required: true
  },
  issues: {
    type: [jiraSchema],
    default: []
  },
  comment: {
    type: String,
    default: ''
  }
}, { strict: 'throw' });


var emailSchema = new MongooseSchema({
  _id: false,
  sentDate: {
    type: Date,
    trim: true,
    default: undefined
  },
  sender_id: {
    type: MongooseSchema.ObjectId,
    ref: 'User'
  },
  recipients: {
    type: [String],
    default: []
  },
  commits: {
    type: [commitSchema],
    default: []
  },
  subject: {
    type: String
  },
  content: {
    type: String
  }
}, { strict: 'throw' });

var Log = new MongooseSchema({
  toolName: {
    type: String,
    trim: true,
    required: true,
    default: ''
  },
  upgradeFromVersion: {
    type: String
  },
  upgradeToVersion: {
    type: String,
    required: true
  },
  userUpgrading: {
    type: String
  },
  startTime: {
    type: Date,
    trim: true,
    default: undefined
  },
  endTime: {
    type: Date,
    trim: true,
    default: undefined
  },
  consoleOutput: {
    type: String
  },
  successful: {
    type: Boolean,
    default: false
  },
  healthCheckSuccessful: {
    type: Boolean,
    default: false
  },
  plannedUpgradeTime: {
    type: Date
  },
  plannedEmail: {
    type: emailSchema,
    default: {}
  },
  completedEmail: {
    type: emailSchema,
    default: {}
  }
}, { strict: 'throw' });

module.exports.Schema = mongoose.model('Log', Log);
