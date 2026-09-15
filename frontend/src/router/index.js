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
import SavedJobsPage from '../components/SavedJobsPage.vue'
import SavedCandidatesPage from '../components/SavedCandidatesPage.vue'
import NotificationsPage from '../components/NotificationsPage.vue'
import NotFoundPage from '../components/NotFoundPage.vue'
import { authRole, hasAuthToken } from '../api/index.js'
import { normalizeRole } from '../utils/role.js'

const routes = [
  { path: '/', name: 'dashboard', component: AppDashboard },
  { path: '/PostNewJob', name: 'post-new-job', component: PostJobView, meta: { roles: ['hiring'] } },
  { path: '/hiring/roles', name: 'all-roles', component: AllRolesPage, meta: { roles: ['hiring'] } },
  { path: '/hiring/candidates', name: 'all-candidates', component: AllCandidatesPage, meta: { roles: ['hiring'] } },
  { path: '/hiring/saved-candidates', name: 'saved-candidates', component: SavedCandidatesPage, meta: { roles: ['hiring'] } },
  { path: '/hiring/shortlists', name: 'review-shortlists', component: ShortlistsPage, meta: { roles: ['hiring'] } },
  { path: '/work/applications', name: 'worker-applications', component: AppliedJobsPage, meta: { roles: ['worker'] } },
  { path: '/work/saved-jobs', name: 'worker-saved-jobs', component: SavedJobsPage, meta: { roles: ['worker'] } },
  { path: '/work/jobs', name: 'all-worker-jobs', component: AllWorkerJobsPage, meta: { roles: ['worker'] } },
  { path: '/notifications', name: 'notifications', component: NotificationsPage },
  {
    path: '/work/jobs/:id',
    name: 'worker-job-detail',
    component: WorkerJobDetailPage,
    props: true,
    meta: { roles: ['worker'] },
  },
  {
    path: '/hiring/candidates/:id',
    name: 'candidate-detail',
    component: CandidateDetailPage,
    meta: { roles: ['hiring'] },
  },
  {
    path: '/hiring/jobs/:id/applicants',
    name: 'job-applicants',
    component: JobApplicantsPage,
    props: { filter: 'all' },
    meta: { roles: ['hiring'] },
  },
  {
    path: '/hiring/jobs/:id/shortlisted',
    name: 'job-shortlisted',
    component: JobApplicantsPage,
    props: { filter: 'shortlisted' },
    meta: { roles: ['hiring'] },
  },
  {
    path: '/jobs/:id',
    name: 'job-view',
    component: JobDetailView,
    props: (route) => ({ id: route.params.id, mode: 'view' }),
    meta: { roles: ['hiring'] },
  },
  {
    path: '/jobs/:id/edit',
    name: 'job-edit',
    component: JobDetailView,
    props: (route) => ({ id: route.params.id, mode: 'edit' }),
    meta: { roles: ['hiring'] },
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (!hasAuthToken() || !to.meta.roles) return true
  const role = normalizeRole(authRole())
  return to.meta.roles.includes(role)
    ? true
    : { name: 'dashboard', query: { routeError: 'That page is not available for this account.' } }
})

export default router
