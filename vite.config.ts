// FIX: Added a triple-slash directive to include Node.js type definitions.
// This resolves the TypeScript error "Property 'cwd' does not exist on type 'Process'" 
// by correctly typing the global 'process' object for the Vite configuration file.
/// <reference types="node" />

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from the root of the project.
  // The third parameter '' makes it load all variables, not just VITE_ prefixed ones.
  // This allows us to read API_KEY from the Vercel environment.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This replaces `process.env.API_KEY` in the code with the actual value
      // from the environment at build time. It's a direct text replacement.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
