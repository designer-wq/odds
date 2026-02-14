import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/api/sports': {
                target: 'https://www.thesportsdb.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/sports/, '/api/v1/json/3'),
            },
            '/sports-img': {
                target: 'https://r2.thesportsdb.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/sports-img/, ''),
            },
        },
    },
});
