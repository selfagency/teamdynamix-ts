import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'teamdynamix-ts',
  description: 'Documentation for the TeamDynamix TypeScript client and generation pipeline.',
  base: '/',
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Developer', link: '/developer/' },
      { text: 'GitHub', link: 'https://github.com/selfagency/teamdynamix-ts' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Overview', link: '/guide/' },
            { text: 'Quick Start', link: '/guide/quick-start' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },

          ],
        },
      ],

      '/developer/': [
        {
          text: 'Developer Docs',
          items: [
            { text: 'Overview', link: '/developer/' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/selfagency/teamdynamix-ts' }],
    editLink: {
      pattern: 'https://github.com/selfagency/teamdynamix-ts/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    search: {
      provider: 'local',
    },
  },
});
