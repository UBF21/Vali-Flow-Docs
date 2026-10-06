/*
 * Safe HMR shim: replaces webpack/hot/dev-server.js
 * webpack 5 + Docusaurus ESM modules don't expose module.hot,
 * causing the original file to throw an uncaught error.
 * This shim checks gracefully and silences the error.
 */
// eslint-disable-next-line no-undef
if (typeof module !== 'undefined' && module.hot) {
  // eslint-disable-next-line no-undef
  module.hot.accept();
}
