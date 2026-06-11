module.exports = {
  plugins: [
    require('autoprefixer'),
  ],
  overrides: {
    'tailwindcss': {
      exclude: [
        '**/node_modules/leaflet/*',
      ],
    },
  },
}
