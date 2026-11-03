module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // drizzle's expo migrator imports the generated .sql files as strings.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
