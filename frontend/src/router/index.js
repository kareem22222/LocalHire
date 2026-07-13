import { createRouter, createWebHistory } from 'vue-router'
import AppDashboard from '../components/AppDashboard.vue'
import PostJobView from '../components/PostJobView.vue'
import JobDetailView from '../components/JobDetailView.vue'

const routes = [
  { path: '/', name: 'dashboard', component: AppDashboard },
  { path: '/PostNewJob', name: 'post-new-job', component: PostJobView },
  {
    path: '/jobs/:id',
    name: 'job-view',
    component: JobDetailView,
    props: (route) => ({ id: route.params.id, mode: 'view' }),
  },
  {
    path: '/jobs/:id/edit',
    name: 'job-edit',
    component: JobDetailView,
    props: (route) => ({ id: route.params.id, mode: 'edit' }),
  },
  // Unknown paths fall back to the dashboard.
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
