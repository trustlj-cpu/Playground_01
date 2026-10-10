// Metro config: keep the development fixtures out of real builds.
// fixtures/ is only bundled when EXPO_PUBLIC_USE_FIXTURES=1 (see src/lib/api.ts).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const FIXTURES = path.join(__dirname, 'fixtures');
const useFixtures = process.env.EXPO_PUBLIC_USE_FIXTURES === '1';
const upstream = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (!useFixtures && moduleName.endsWith('/fixtures') && path.resolve(path.dirname(context.originModulePath), moduleName) === FIXTURES) {
    return { type: 'empty' };
  }
  return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
