import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import webExtension from "vite-plugin-web-extension";
import Components from 'unplugin-vue-components/vite';
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    webExtension({
      manifest: "./src/manifest.json",
      watchFilePaths: ["package.json", "./src/manifest.json"],
      skipManifestValidation: true,
    }),
    Components({
      resolvers: [AntDesignVueResolver({
        importStyle: false,
      })],
    }),
  ],
});
