// createWebHistory() means real URLs (/patterns/3) instead of hash URLs
// (/#/patterns/3) — the host needs a rewrite rule serving index.html for
// any path (see vercel.json).
import { createRouter, createWebHistory } from 'vue-router'

// Lazy-loaded (`() => import(...)`) so each screen is its own JS chunk,
// fetched only when the user navigates there.
const routes = [
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
  { path: '/patterns', name: 'patterns', component: () => import('../views/PatternsView.vue') },
  { path: '/patterns/:id', name: 'pattern-detail', component: () => import('../views/PatternDetailView.vue'), props: true },
  { path: '/problems/:id', name: 'problem-detail', component: () => import('../views/ProblemDetailView.vue'), props: true },
  { path: '/train/:kind/:id', name: 'trainer', component: () => import('../views/TrainerView.vue'), props: true },
  { path: '/queue', name: 'queue', component: () => import('../views/QueueView.vue') },
  { path: '/protocols', name: 'protocols', component: () => import('../views/ProtocolsView.vue') },
  { path: '/data', name: 'data', component: () => import('../views/DataView.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
