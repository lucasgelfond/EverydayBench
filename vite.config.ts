import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
			},
			adapter: adapter()
		})
	],
	// Every site is a hostname of this one server (reeltix.everydaybench.test, marquee.everydaybench.test, ...).
	server: { host: true, port: 8700, allowedHosts: true },
	preview: { host: true, port: 8700, allowedHosts: true }
});
