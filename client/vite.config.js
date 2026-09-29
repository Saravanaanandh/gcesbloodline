import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from "path"
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Bind to all interfaces so other devices on the same Wi-Fi can open the
    // Vite dev server via your LAN IP (e.g. http://172.16.137.161:5173).
    // This has no effect on the production build.
    host: "0.0.0.0",
  },
})
