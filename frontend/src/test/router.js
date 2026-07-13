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
    ],
  })
}
