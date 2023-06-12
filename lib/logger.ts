import { createLogger } from 'sat-utils';

const logger = createLogger().addCustomLevel('chainer', 'CHAIN_LOG', 'CHAIN_LOG', 'info', 'BgBlue', 'BgWhite');

export { logger };
