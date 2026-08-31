// VUE CONCEPT: the router.
// In ASP.NET terms this is closest to your route table / endpoint mapping —
// it's the thing that looks at the URL and decides which "page" component to render.
// createWebHistory() means we use normal URLs (/patterns/3) instead of
// hash URLs (/#/patterns/3); it needs a tiny server rewrite rule in production,
// which Vite's dev server and most static hosts already do for you.
import { createRouter, createWebHistory } from 'vue-router'

// Route components are loaded lazily (the `() => import(...)` form) so each
// screen becomes its own JS chunk, fetched only when the user navigates there.
// This is the Vue-Router equivalent of lazy-loading an assembly on first use.
const routes = [
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
  { path: '/patterns', name: 'patterns', component: () => import('../views/PatternsView.vue') },
  { path: '/patterns/:id', name: 'pattern-detail', component: () => import('../views/PatternDetailView.vue'), props: true },
  { path: '/problems/:id', name: 'problem-detail', component: () => import('../views/ProblemDetailView.vue'), props: true },
  { path: '/train/:kind/:id', name: 'trainer', component: () => import('../views/TrainerView.vue'), props: true },
  { path: '/queue', name: 'queue', component: () => import('../views/QueueView.vue') },
  { path: '/protocols', name: 'protocols', component: () => import('../views/ProtocolsView.vue') },
  { path: '/data', name: 'data', component: () => import('../views/DataView.vue') },
  { path: '/style-guide', name: 'style-guide', component: () => import('../views/StyleGuideView.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
