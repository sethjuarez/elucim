import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://elucim.com',
  integrations: [
    starlight({
      title: 'Elucim',
      description: 'Animated explanations for the web. A React library for creating 3Blue1Brown-style visualizations.',
      logo: {
        src: './src/assets/logo.svg',
      },
      favicon: '/favicon.svg',
      editLink: {
        baseUrl: 'https://github.com/sethjuarez/elucim/edit/main/docs/',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/sethjuarez/elucim' },
      ],
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: '',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://cdn.jsdelivr.net/npm/katex@0.16.33/dist/katex.min.css',
          },
        },
      ],
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { slug: 'getting-started/installation' },
            { slug: 'getting-started/quick-start' },
            { slug: 'getting-started/core-concepts' },
          ],
        },
        {
          label: 'Primitives',
          items: [
            { slug: 'primitives/circle' },
            { slug: 'primitives/line' },
            { slug: 'primitives/arrow' },
            { slug: 'primitives/rect' },
            { slug: 'primitives/text' },
            { slug: 'primitives/polygon' },
          ],
        },
        {
          label: 'Math & Data',
          items: [
            { slug: 'math/axes' },
            { slug: 'math/vectors' },
            { slug: 'math/matrix' },
            { slug: 'math/graph' },
            { slug: 'math/latex' },
            { slug: 'math/barchart' },
          ],
        },
        {
          label: 'Animations',
          items: [
            { slug: 'animations/fade' },
            { slug: 'animations/draw' },
            { slug: 'animations/transform' },
            { slug: 'animations/stagger' },
            { slug: 'animations/easing' },
            { slug: 'animations/timeline' },
          ],
        },
        {
          label: 'Advanced',
          items: [
            { slug: 'advanced/player' },
            { slug: 'advanced/presentation' },
            { slug: 'advanced/export' },
            { slug: 'advanced/hooks' },
          ],
        },
        {
          label: 'DSL (JSON & Builder)',
          items: [
            { slug: 'dsl/overview' },
            { slug: 'dsl/renderer' },
            { slug: 'dsl/validation' },
            { slug: 'dsl/builder-api' },
            { slug: 'dsl/themes' },
          ],
        },
        {
          label: 'Examples',
          items: [
            { slug: 'examples/calculus' },
            { slug: 'examples/agentic-loop' },
            { slug: 'examples/recipes' },
          ],
        },
      ],
    }),
    react(),
  ],
});
