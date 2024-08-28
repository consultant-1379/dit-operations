import { core } from '../../modules/core/client/core.client.module';
import { logs } from '../../modules/upgradeLogs/client/upgradeLogs.client.module';
import { tools } from '../../modules/tools/client/tools.client.module';
import { contactInfo } from '../../modules/contactInfo/client/contactInfo.client.module';
import { users } from '../../modules/users/client/users.client.module';

export default [
  core,
  tools,
  contactInfo,
  logs,
  users
];
