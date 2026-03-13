import { defineConfig } from "vite";
import { resolve } from "path";
import { readdirSync } from "fs";

const htmlInputs = Object.fromEntries(
  readdirSync(__dirname)
    .filter((file) => file.endsWith(".html"))
    .map((file) => [file.replace(".html", ""), resolve(__dirname, file)])
);

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: htmlInputs,
    },
  },
});
