#!/usr/bin/env node

// Custom server script to avoid browser opening issues
import { createServer } from 'vite'

async function startServer() {
  try {
    const server = await createServer({
      configFile: './vite.config.js',
      server: {
        port: 3006,
        host: '0.0.0.0',
        open: false,
        strictPort: true
      }
    })

    await server.listen()
    
    const info = server.config.logger.info
    info(`Server running at:`)
    info(`- Local:   http://localhost:3006/`)
    info(`- Network: http://0.0.0.0:3006/`)
    
  } catch (error) {
    console.error('Error starting server:', error)
    process.exit(1)
  }
}

startServer()
