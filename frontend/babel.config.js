module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env",
        "blocklist": null,
        "allowlist": null,
        "safe": false,
        "allowUndefined": true
      }],
      // Enable tree shaking and dead code elimination
      ["@babel/plugin-transform-runtime", {
        "regenerator": true,
        "helpers": true,
        "useESModules": false
      }],
      // Remove console logs in production
      process.env.NODE_ENV === 'production' && 'transform-remove-console'
    ].filter(Boolean)
  };
}; 