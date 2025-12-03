// Central export file for all models organized by modules
const UserModule = require('./user');
const PlanModule = require('./plan');
const ChatModule = require('./chat');
const InviteModule = require('./invite');
const PollModule = require('./poll');
const AnalyticsModule = require('./analytics');
const OtherModule = require('./other');

module.exports = {
  // User module
  ...UserModule,
  
  // Plan module
  ...PlanModule,
  
  // Chat module
  ...ChatModule,
  
  // Invite module
  ...InviteModule,
  
  // Poll module
  ...PollModule,
  
  // Analytics module
  ...AnalyticsModule,
  
  // Other module
  ...OtherModule
};
