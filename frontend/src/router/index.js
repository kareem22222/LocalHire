import { createRouter, createWebHistory } from 'vue-router'
import AppDashboard from '../components/AppDashboard.vue'
import PostJobView from '../components/PostJobView.vue'
import JobDetailView from '../components/JobDetailView.vue'
import AllRolesPage from '../components/AllRolesPage.vue'
import AllCandidatesPage from '../components/AllCandidatesPage.vue'
import JobApplicantsPage from '../components/JobApplicantsPage.vue'
import CandidateDetailPage from '../components/CandidateDetailPage.vue'
import ShortlistsPage from '../components/ShortlistsPage.vue'
import WorkerJobDetailPage from '../components/WorkerJobDetailPage.vue'
import AppliedJobsPage from '../components/AppliedJobsPage.vue'
import AllWorkerJobsPage from '../components/AllWorkerJobsPage.vue'
import NotificationsPage from '../components/NotificationsPage.vue'

const routes = [
  { path: '/', name: 'dashboard', component: AppDashboard },
  { path: '/PostNewJob', name: 'post-new-job', component: PostJobView },
  { path: '/hiring/roles', name: 'all-roles', component: AllRolesPage },
  { path: '/hiring/candidates', name: 'all-candidates', component: AllCandidatesPage },
  { path: '/hiring/shortlists', name: 'review-shortlists', component: ShortlistsPage },
  { path: '/work/applications', name: 'worker-applications', component: AppliedJobsPage },
  { path: '/work/jobs', name: 'all-worker-jobs', component: AllWorkerJobsPage },
  { path: '/notifications', name: 'notifications', component: NotificationsPage },
  {
    path: '/work/jobs/:id',
    name: 'worker-job-detail',
    component: WorkerJobDetailPage,
    props: true,
  },
  {
    path: '/hiring/candidates/:id',
    name: 'candidate-detail',
    component: CandidateDetailPage,
  },
  {
    path: '/hiring/jobs/:id/applicants',
    name: 'job-applicants',
    component: JobApplicantsPage,
    props: { filter: 'all' },
  },
  {
    path: '/hiring/jobs/:id/shortlisted',
    name: 'job-shortlisted',
    component: JobApplicantsPage,
    props: { filter: 'shortlisted' },
  },
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
