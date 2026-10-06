import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  plugins: [
    // Fix: webpack-dev-server v5 injects webpack/hot/dev-server as an entry,
    // but module.hot is not available in Docusaurus's webpack 5 setup, causing
    // an uncaught error. NormalModuleReplacementPlugin intercepts the module
    // at resolution time and replaces it with a safe shim.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (() => ({
      name: 'webpack-hmr-shim',
      configureWebpack(_config: unknown, isServer: boolean) {
        if (isServer) return undefined;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const webpack = require('webpack');
        return {
          plugins: [
            new webpack.NormalModuleReplacementPlugin(
              /webpack[/\\]hot[/\\]dev-server/,
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              require.resolve('./src/webpack-hmr-shim.js'),
            ),
          ],
        };
      },
    })) as any,
    'docusaurus-plugin-drawio',
    function drawioWebpackLoader() {
      return {
        name: 'drawio-webpack-loader',
        configureWebpack() {
          return {
            module: {
              rules: [{ test: /\.drawio$/, type: 'asset/source' }],
            },
          };
        },
      };
    },
  ],

  title: 'Vali-Flow',
  tagline: '// one spec. four evaluators.',
  favicon: 'img/favicon.ico',

  url: 'https://vali-flow.github.io',
  baseUrl: '/',

  organizationName: 'vali-flow',
  projectName: 'vali-flow',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  trailingSlash: false,

  stylesheets: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Space+Mono:wght@400;500&display=swap',
      type: 'text/css',
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    localeConfigs: {
      en: { label: 'English', direction: 'ltr', htmlLang: 'en' },
      es: { label: 'Español', direction: 'ltr', htmlLang: 'es' },
    },
  },

  markdown: { format: 'mdx' },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl: 'https://github.com/UBF21/Vali-Flow/tree/main/',
          showLastUpdateTime: false,
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.png',
    metadata: [
      { name: 'robots', content: 'index, follow' },
      { name: 'theme-color', content: '#4F46E5' },
      { name: 'keywords', content: '.NET, NuGet, C#, specification pattern, expression trees, LINQ, EF Core, Dapper, SQL, NoSQL, MongoDB, DynamoDB, Elasticsearch, Redis, validation, Vali-Flow' },
      { name: 'author', content: 'Felipe Montenegro' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Vali-Flow' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: '@vali_flow' },
    ],
    colorMode: { defaultMode: 'dark', respectPrefersColorScheme: true },
    navbar: {
      title: 'Vali-Flow',
      logo: { alt: 'Vali-Flow', src: 'img/logo.png' },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        { type: 'localeDropdown', position: 'right' },
        {
          href: 'https://www.nuget.org/packages/Vali-Flow',
          label: 'NuGet',
          position: 'right',
        },
        {
          href: 'https://github.com/UBF21/Vali-Flow',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/introduction' },
            { label: 'Quick Start', to: '/docs/quick-start' },
            { label: 'Core', to: '/docs/core/getting-started' },
            { label: 'Evaluators', to: '/docs/adapters/ef-core' },
          ],
        },
        {
          title: 'Packages',
          items: [
            { label: 'Vali-Flow', href: 'https://www.nuget.org/packages/Vali-Flow' },
            { label: 'Vali-Flow.Core', href: 'https://www.nuget.org/packages/Vali-Flow.Core' },
            { label: 'Vali-Flow.InMemory', href: 'https://www.nuget.org/packages/Vali-Flow.InMemory' },
            { label: 'Vali-Flow.Sql', href: 'https://www.nuget.org/packages/Vali-Flow.Sql' },
            { label: 'Vali-Flow.NoSql.MongoDB', href: 'https://www.nuget.org/packages/Vali-Flow.NoSql.MongoDB' },
            { label: 'Vali-Flow.NoSql.DynamoDB', href: 'https://www.nuget.org/packages/Vali-Flow.NoSql.DynamoDB' },
            { label: 'Vali-Flow.NoSql.Elasticsearch', href: 'https://www.nuget.org/packages/Vali-Flow.NoSql.Elasticsearch' },
            { label: 'Vali-Flow.NoSql.Redis', href: 'https://www.nuget.org/packages/Vali-Flow.NoSql.Redis' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Vali-Tempo', href: 'https://github.com/UBF21/Vali-Tempo' },
            { label: 'Vali-Mediator', href: 'https://github.com/UBF21/Vali-Mediator' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} The Vali-Flow Contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['csharp', 'bash', 'json', 'yaml', 'markup'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
