// Used only by Jest (see jest.config.cjs). Vite's own dev/build pipeline
// uses esbuild via @vitejs/plugin-react and explicitly ignores this file
// (babelrc/configFile disabled in vite.config.ts) — this keeps the two
// toolchains from interfering with each other.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
};
