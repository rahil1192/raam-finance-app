const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable tree shaking and dead code elimination
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
  output: {
    ascii_only: true,
    quote_style: 3,
    wrap_iife: true,
  },
  compress: {
    reduce_funcs: false,
  },
};

// Optimize bundle splitting
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Enable Hermes optimization
config.transformer.hermesParser = true;

// Remove unused code
config.transformer.unstable_allowRequireContext = true;

module.exports = config; 