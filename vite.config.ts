import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	server: {
		host: "::",
		port: 8080,
	},

	build: {
		sourcemap: false,
		minify: "oxc",
	},

	css: {
		modules: {
			generateScopedName:
				mode === "production"
					? "[hash:base64:5]"
					: "[name]__[local]__[hash:base64:5]",
		},
	},

	plugins: [
		react(),
		// mode === "development" && componentTagger(),
		svgr(),
	].filter(Boolean),

	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},

	define: {
		__BUNDLED_DEV__: "false",
		__SERVER_FORWARD_CONSOLE__: "false",
	},

	assetsInclude: ["**/*.lottie"],
}));
