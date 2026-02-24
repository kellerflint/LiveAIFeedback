import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true, // Needed for docker
        allowedHosts: true, // Needed for host.docker.internal
        watch: {
            usePolling: true, // Needed for docker volumes on some host OSs
        }
    }
})
