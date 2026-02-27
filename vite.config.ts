import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      port: 5173, // Porta padrão do Vite para evitar conflito com o backend na porta 3000
      allowedHosts: [
        'itrust.tec.br',
        'www.itrust.tec.br',
        'itracky.itrust.tec.br'
      ],
      proxy: {
        '/api': 'http://localhost:3000', // Redireciona chamadas /api para o seu backend
        '/uploads': 'http://localhost:3000', // Redireciona chamadas de imagem para o backend
      },
    },
});
