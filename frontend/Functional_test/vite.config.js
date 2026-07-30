import baseConfig from '../vite.config.js'
import functionalTestApi from './mock-api.js'

export default {
  ...baseConfig,
  plugins: [functionalTestApi(), ...baseConfig.plugins],
  server: {
    ...baseConfig.server,
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
    proxy: {},
  },
}
