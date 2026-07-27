import { createRouter, createMemoryHistory } from 'vue-router'

// Lightweight router for component tests. Uses stub components so specs can
// mount views that call useRouter()/router.push without pulling in the real
// route components.
export function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div />' } },
      { path: '/PostNewJob', name: 'post-new-job', component: { template: '<div />' } },
      { path: '/hiring/roles', name: 'all-roles', component: { template: '<div />' } },
      { path: '/hiring/candidates', name: 'all-candidates', component: { template: '<div />' } },
      { path: '/hiring/shortlists', name: 'review-shortlists', component: { template: '<div />' } },
      { path: '/work/applications', name: 'worker-applications', component: { template: '<div />' } },
      { path: '/work/jobs', name: 'all-worker-jobs', component: { template: '<div />' } },
      { path: '/notifications', name: 'notifications', component: { template: '<div />' } },
      { path: '/work/jobs/:id', name: 'worker-job-detail', component: { template: '<div />' } },
      { path: '/hiring/candidates/:id', name: 'candidate-detail', component: { template: '<div />' } },
      { path: '/hiring/jobs/:id/applicants', name: 'job-applicants', component: { template: '<div />' } },
      { path: '/hiring/jobs/:id/shortlisted', name: 'job-shortlisted', component: { template: '<div />' } },
      { path: '/jobs/:id', name: 'job-view', component: { template: '<div />' } },
      { path: '/jobs/:id/edit', name: 'job-edit', component: { template: '<div />' } },
    ],
  })
}
