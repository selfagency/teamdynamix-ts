import { defineConfig } from 'vitepress';
import { useSidebar } from 'vitepress-openapi';
import spec from '../public/openapi.json' with { type: 'json' };

const sidebar = useSidebar({
  spec,
  linkPrefix: '/operations/',
  tagLinkPrefix: '/tags/',
});

export default defineConfig({
  title: 'teamdynamix-ts',
  description: 'Documentation for the TeamDynamix TypeScript client and generation pipeline.',
  base: '/teamdynamix-ts/',
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
            { text: 'Full Spec View', link: '/api/spec' },
          ],
        },
      ],
      '/operations/': [
        {
          text: 'Operations',
          items: sidebar.itemsByPaths({
            linkPrefix: '/operations/',
            collapsible: true,
            depth: 4,
          }),
        },
      ],
      '/tags/': [
        {
          text: 'Tags',
          items: sidebar.itemsByTags({
            linkPrefix: '/tags/',
          }),
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
