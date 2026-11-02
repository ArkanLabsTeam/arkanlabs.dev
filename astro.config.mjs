// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://arkanlabs.dev",
  fonts: [{
    provider: fontProviders.local(),
    name: "LibronRegular",
    cssVariable: "--font-libron-regular",
    options: {
      variants: [{
        src: ['./src/assets/fonts/Libron-Regular.woff2'],
        weight: 'normal',
        style: 'normal'
      }]
    }
  },
  {
    provider: fontProviders.google(),
    name: "Bricolage Grotesque",
    cssVariable: "--font-bricolage-grotesque",
  },
  {
    provider: fontProviders.google(),
    name: "Unbounded",
    cssVariable: "--font-unbounded",
  },
  {
    provider: fontProviders.google(),
    name: "JetBrains Mono",
    cssVariable: "--font-mono"
  }
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [sitemap()],
});