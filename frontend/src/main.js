import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { hasAuthToken } from './api'
import router from './router'
import { installIrisTransition } from './utils/irisTransition'
import './styles.css'
import './light-theme.css'

createApp(App).use(createPinia()).use(router).mount('#app')
installIrisTransition(router, hasAuthToken)
