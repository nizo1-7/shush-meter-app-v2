import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/shush-meter-app-v2/', // Add this line
  plugins: [react()],
})
