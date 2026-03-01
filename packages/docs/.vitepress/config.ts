import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Elucim',
  description: 'Animate concepts. Illuminate understanding.',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/components' },
      { text: 'Explorer', link: 'http://localhost:3200' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is Elucim?', link: '/guide/what-is-elucim' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Scene & Composition', link: '/guide/scene' },
            { text: 'Animation Frames', link: '/guide/frames' },
            { text: 'Easing Functions', link: '/guide/easing' },
            { text: 'Sequences', link: '/guide/sequences' },
          ],
        },
        {
          text: 'Primitives',
          items: [
            { text: 'Basic Shapes', link: '/guide/basic-shapes' },
            { text: 'Math Primitives', link: '/guide/math-primitives' },
            { text: 'LaTeX Rendering', link: '/guide/latex' },
          ],
        },
        {
          text: 'Animations',
          items: [
            { text: 'Animation Components', link: '/guide/animations' },
            { text: 'Timeline DSL', link: '/guide/timeline' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Video Export', link: '/guide/export' },
            { text: 'Creating Visuals', link: '/guide/creating-visuals' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Components', link: '/api/components' },
            { text: 'Primitives', link: '/api/primitives' },
            { text: 'Animations', link: '/api/animations' },
            { text: 'Hooks', link: '/api/hooks' },
            { text: 'Easing', link: '/api/easing' },
            { text: 'Export', link: '/api/export' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/example/elucim' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Elucim Contributors',
    },
    search: {
      provider: 'local',
    },
  },
});
