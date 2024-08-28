'use strict';

var mongoose = require('mongoose');
var MongooseSchema = mongoose.Schema;
var User = require('../../../users/server/models/user.server.model').Schema;

var ContactInfo = new MongooseSchema({
  team: {
    type: String,
    trim: true,
    unique: true,
    required: true
  },
  teamEmail: {
    type: String,
    trim: true,
    required: true
  },
  scrumMaster: {
    type: MongooseSchema.ObjectId,
    ref: 'User'
  },
  productOwner: {
    type: MongooseSchema.ObjectId,
    ref: 'User'
  },
  jiraTemplateUrl: {
    type: String,
    trim: true,
    required: true
  }
}, { strict: 'throw' });

module.exports.Schema = mongoose.model('ContactInfo', ContactInfo);
