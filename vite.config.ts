import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
const base = '/midi-seq/'

export default defineConfig({
  base,
  server: {
    allowedHosts: ['pizzabox', 'localhost', '192.168.0.10'],
  },
  preview: {
    allowedHosts: ['pizzabox', 'localhost', '192.168.0.10'],
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'midi-seq',
        short_name: 'midi-seq',
        description: 'A web MIDI sequencer for creative musicians.',
        theme_color: '#16171d',
        background_color: '#16171d',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}favicon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
