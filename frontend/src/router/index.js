import { createRouter, createWebHistory } from 'vue-router'
import AppDashboard from '../components/AppDashboard.vue'
import PostJobView from '../components/PostJobView.vue'

const routes = [
  { path: '/', name: 'dashboard', component: AppDashboard },
  { path: '/PostNewJob', name: 'post-new-job', component: PostJobView },
  // Unknown paths fall back to the dashboard.
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
