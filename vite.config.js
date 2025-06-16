import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import Components from '@uni-helper/vite-plugin-uni-components'
import { UvResolver } from '@uni-helper/vite-plugin-uni-components/resolvers'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    Components({
      dts: true,
      resolvers: [UvResolver()]
    }),
    uni(),
  ],
  
})


