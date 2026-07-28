<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJobsStore } from '../stores/jobs'
import { MAX_VISIBLE_JOBS } from '../utils/jobDisplay'
import { moveSpotlight, resetSpotlight } from '../utils/spotlightCard'
import BrandLogo from './BrandLogo.vue'
import CountUp from './CountUp.vue'
import Pagination from './ui/Pagination.vue'
import SkeletonShimmer from './ui/SkeletonShimmer.vue'
import '../hiring-dashboard.css'

const route = useRoute()
const router = useRouter()
const jobsStore = useJobsStore()
const loading = ref(true)
const error = ref('')

const applications = computed(() => jobsStore.myApplications)
const totalPages = computed(() => Math.ceil(applications.value.length / MAX_VISIBLE_JOBS))
const currentPage = computed(() => Math.min(Math.max(Number.parseInt(route.query.page, 10) || 1, 1), totalPages.value || 1))
const visibleApplications = computed(() => applications.value.slice((currentPage.value - 1) * MAX_VISIBLE_JOBS, currentPage.value * MAX_VISIBLE_JOBS))
const shortlisted = computed(() => applications.value.filter((item) => item.status === 'Shortlisted').length)
const hired = computed(() => applications.value.filter((item) => item.status === 'Hired').length)

const statusSummary = {
  Applied: 'Application sent. The employer has not reviewed it yet.',
  Shortlisted: 'You were shortlisted. The employer may contact you next.',
  Rejected: 'The employer did not select you for this role.',
  Hired: 'You were selected for this role.',
}

const statusProgress = (status) => ({ Applied: 28, Shortlisted: 64, Rejected: 100, Hired: 100 })[status] ?? 50
const statusMilestone = (status) => ({
  Applied: 'Waiting for review',
  Shortlisted: 'Shortlist reached',
  Rejected: 'Application closed',
  Hired: 'Offer reached',
})[status] ?? 'Status updated'

onMounted(async () => {
  try {
    await jobsStore.loadMyApplications({ force: true })
  } catch {
    error.value = 'Could not load your applications.'
  } finally {
    loading.value = false
  }
})

function changePage(page) {
  router.push({ query: { ...route.query, page: page === 1 ? undefined : String(page) } })
}
</script>

<template>
  <div class="dash-shell applied-shell">
    <header class="dash-header">
      <BrandLogo @click.prevent="router.push('/')" />
    </header>

    <main class="applied-page">
      <section class="applied-hero">
        <div class="applied-hero__copy">
          <span class="applied-kicker">Application journey</span>
          <h1>Applied jobs</h1>
          <p>Every application, every update, and your next opportunity—all in one clear timeline.</p>
          <button type="button" class="dash-btn applied-outline" @click="router.push('/')">
            <span aria-hidden="true">←</span> Back to jobs
          </button>
        </div>
      </section>

      <section class="applied-metrics" aria-label="Application totals">
        <div style="--metric-index: 0"><span>Total applications</span><strong><CountUp :to="applications.length" separator="" /></strong><i></i></div>
        <div style="--metric-index: 1"><span>Shortlisted</span><strong><CountUp :to="shortlisted" separator="" /></strong><i></i></div>
        <div style="--metric-index: 2"><span>Hired</span><strong><CountUp :to="hired" separator="" /></strong><i></i></div>
      </section>

      <SkeletonShimmer v-if="loading" variant="job" :count="applications.length || 3" label="Loading applications" />
      <p v-else-if="error" class="applied-error" role="alert">{{ error }}</p>
      <section v-else-if="applications.length" class="applied-journey" aria-label="Your application timeline">
        <div class="applied-journey__head">
          <div><span class="applied-kicker">Live status</span><h2>Your journey so far</h2></div>
          <p>{{ applications.length }} {{ applications.length === 1 ? 'role' : 'roles' }} tracked</p>
        </div>

        <div class="applied-list">
          <a
            v-for="(application, index) in visibleApplications"
            :key="application.id"
            class="applied-card spotlight-card spotlight-card--worker"
            :class="`applied-card--${application.status.toLowerCase()}`"
            :href="`/work/jobs/${application.jobPostId}`"
            :style="{ '--card-index': index }"
            @pointermove="moveSpotlight"
            @pointerleave="resetSpotlight"
            @pointercancel="resetSpotlight"
            @click.prevent="router.push({ name: 'worker-job-detail', params: { id: application.jobPostId } })"
          >
            <div class="applied-card__identity">
              <div class="applied-card__topline">
                <span class="applied-card__number">{{ String((currentPage - 1) * MAX_VISIBLE_JOBS + index + 1).padStart(2, '0') }}</span>
                <span class="applied-card__status" :class="`applied-card__status--${application.status.toLowerCase()}`">{{ application.status }}</span>
              </div>
              <h2>{{ application.jobTitle }}</h2>
              <p>{{ application.workplaceName }} · {{ application.cityArea }}</p>
            </div>

            <div class="applied-card__track">
              <progress
                class="applied-card__rail"
                :aria-label="`${application.jobTitle} application progress`"
                max="100"
                :value="statusProgress(application.status)"
              ></progress>
              <div class="applied-card__milestones"><span>Applied</span><strong>{{ statusMilestone(application.status) }}</strong></div>
            </div>

            <div class="applied-card__summary">
              <span><strong>Latest update</strong><small>Applied {{ new Date(application.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) }}</small></span>
              <p>{{ statusSummary[application.status] || 'Your application status was updated.' }}</p>
              <b class="applied-card__link">View job <span aria-hidden="true">→</span></b>
            </div>
          </a>
        </div>
        <Pagination :page="currentPage" :total-pages="totalPages" @change="changePage" />
      </section>

      <div v-else class="applied-empty">
        <span aria-hidden="true">◎</span>
        <h2>No applications yet</h2>
        <p>Find a nearby role that feels right and start your journey.</p>
        <button type="button" class="dash-btn applied-primary" @click="router.push('/')">Explore local jobs</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.applied-primary { color: #fff; background: var(--worker-role-gradient); }
.applied-outline { display: inline-flex; gap: 8px; align-items: center; margin-top: 24px; color: var(--worker-role-green-text); border: 1.5px solid rgba(var(--worker-role-green-rgb),.3); background: rgba(255,255,255,.86); }
.applied-page { display: grid; gap: 24px; max-width: 1120px; margin: 0 auto; padding: 36px 24px 80px; }
.applied-kicker { color: var(--worker-role-green-text); font-size: 10px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
.applied-hero { position: relative; min-height: 280px; overflow: hidden; border: 1px solid rgba(18,50,74,.08); border-radius: 28px; background: #fff; box-shadow: 0 24px 70px rgba(18,50,74,.08); animation: hero-enter .65s cubic-bezier(.22,1,.36,1) both; }
.applied-hero::before { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(circle,rgba(18,50,74,.06) 1px,transparent 1px); background-size: 22px 22px; content: ''; mask-image: linear-gradient(to right,#000,transparent 70%); }
.applied-hero__copy { position: relative; z-index: 1; align-self: center; padding: clamp(32px,5vw,58px); }
.applied-hero h1 { max-width: 660px; margin-top: 10px; color: #0b3658; font: 800 clamp(42px,7vw,76px)/.96 Manrope,sans-serif; letter-spacing: -.065em; }
.applied-hero p { max-width: 610px; margin-top: 18px; color: #526977; font-size: 15px; line-height: 1.7; }
.applied-metrics { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
.applied-metrics div { position: relative; overflow: hidden; padding: 22px 24px; border: 1px solid rgba(18,50,74,.08); border-radius: 18px; background: rgba(255,255,255,.9); box-shadow: 0 12px 34px rgba(18,50,74,.05); animation: metric-enter .45s cubic-bezier(.22,1,.36,1) both; animation-delay: calc(120ms + var(--metric-index) * 70ms); }
.applied-metrics div > span { color: #526977; font-size: 11px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }.applied-metrics strong { display: block; margin-top: 10px; color: var(--worker-role-green-text); font: 800 clamp(44px,5vw,60px)/1 Manrope,sans-serif; }.applied-metrics strong > span { color: inherit; font: inherit; letter-spacing: inherit; }.applied-metrics i { position: absolute; right: -18px; bottom: -26px; width: 88px; height: 88px; border-radius: 50%; background: rgba(var(--worker-role-green-rgb),.07); }
.applied-journey { --pagination-accent: var(--worker-role-green-text); display: grid; gap: 16px; padding: 24px; border: 1px solid rgba(18,50,74,.08); border-radius: 24px; background: rgba(248,252,253,.72); }
.applied-journey__head { display: flex; align-items: end; justify-content: space-between; gap: 20px; padding: 4px 4px 10px; }.applied-journey__head h2 { margin-top: 5px; color: #0b3658; font: 800 25px/1.2 Manrope,sans-serif; letter-spacing: -.035em; }.applied-journey__head > p { color: #708794; font-size: 12px; font-weight: 800; }
.applied-list { display: grid; gap: 14px; }
.applied-card { --status-start: #07559a; --status-end: #168caa; --status-rgb: 7,85,154; --spotlight-rgb: var(--status-rgb); display: grid; grid-template-columns: minmax(210px,.85fr) minmax(210px,.7fr) minmax(260px,1fr); gap: 26px; align-items: center; padding: 24px; color: inherit; text-decoration: none; border: 1px solid rgba(18,50,74,.08); border-radius: 20px; background: #fff; box-shadow: 0 12px 34px rgba(18,50,74,.06); cursor: pointer; animation: application-enter .55s cubic-bezier(.22,1,.36,1) backwards; animation-delay: calc(var(--card-index) * 65ms); transition: border-color .25s ease,box-shadow .25s ease,transform .25s ease,opacity .25s ease; }
.applied-card--shortlisted { --status-start: #5145b5; --status-end: #7c3aed; --status-rgb: 81,69,181; }.applied-card--hired { --status-start: #0b7a4b; --status-end: #20a875; --status-rgb: 11,122,75; }.applied-card--rejected { --status-start: #b42318; --status-end: #e5484d; --status-rgb: 180,35,24; }
.applied-card:hover { border-color: rgba(var(--status-rgb),.32); box-shadow: 0 20px 46px rgba(var(--status-rgb),.12); }.applied-card:focus-visible { outline: 3px solid rgba(var(--status-rgb),.25); outline-offset: 2px; }.applied-list:has(.applied-card:hover) .applied-card:not(:hover) { opacity: .58; transform: scale(.98); }
.applied-card__topline { display: flex; align-items: center; gap: 9px; }.applied-card__number { color: #91a3ab; font: 800 10px ui-monospace,monospace; letter-spacing: .08em; }.applied-card h2 { margin-top: 12px; color: #0b3658; font: 800 21px/1.2 Manrope,sans-serif; letter-spacing: -.025em; }.applied-card__identity > p { margin-top: 6px; color: #526977; font-size: 13px; }
.applied-card__status { display: inline-flex; padding: 6px 10px; color: #fff; border-radius: 999px; background: linear-gradient(135deg,var(--status-start),var(--status-end)); box-shadow: 0 7px 18px rgba(var(--status-rgb),.22); font-size: 11px; font-weight: 800; text-transform: uppercase; }
.applied-card__track { display: grid; gap: 10px; }.applied-card__rail { width: 100%; height: 8px; overflow: hidden; border: 0; border-radius: 999px; background: #e4eee9; appearance: none; }.applied-card__rail::-webkit-progress-bar { background: #e4eee9; }.applied-card__rail::-webkit-progress-value { border-radius: 999px; background: linear-gradient(90deg,var(--status-start),var(--status-end)); }.applied-card__rail::-moz-progress-bar { border-radius: 999px; background: linear-gradient(90deg,var(--status-start),var(--status-end)); }.applied-card__milestones { display: flex; justify-content: space-between; gap: 12px; color: #718894; font-size: 10px; font-weight: 800; }.applied-card__milestones strong { color: var(--status-start); text-align: right; }
.applied-card__summary { display: grid; gap: 10px; padding-left: 24px; border-left: 1px solid rgba(18,50,74,.08); }.applied-card__summary > span { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.applied-card__summary strong { color: #12324a; font-size: 12px; }.applied-card__summary small { color: #7b909b; font-size: 10px; }.applied-card__summary p { color: #526977; font-size: 12px; line-height: 1.55; }.applied-card__link { color: var(--status-start); font-size: 11px; }.applied-card__link span { display: inline-block; transition: transform .2s ease; }.applied-card:hover .applied-card__link span { transform: translateX(4px); }
.applied-empty,.applied-error { padding: 56px 24px; text-align: center; border: 1px solid rgba(18,50,74,.08); border-radius: 20px; background: #fff; box-shadow: 0 14px 40px rgba(18,50,74,.05); animation: application-enter .45s ease both; }.applied-empty > span { display: grid; width: 58px; height: 58px; margin: 0 auto 18px; place-items: center; color: var(--worker-role-green-text); border-radius: 18px; background: rgba(var(--worker-role-green-rgb),.1); font-size: 24px; }.applied-empty h2 { color: #0b3658; }.applied-empty p { margin-top: 7px; color: #526977; }.applied-empty .dash-btn { margin-top: 22px; }.applied-error { color: #b42318; }
@keyframes hero-enter { from { opacity: 0; transform: translateY(18px); } } @keyframes metric-enter { from { opacity: 0; transform: translateY(12px); } } @keyframes application-enter { from { opacity: 0; transform: translateY(18px) scale(.985); } }
@media (max-width: 900px) { .applied-card { grid-template-columns: minmax(200px,.8fr) 1fr; }.applied-card__summary { grid-column: 1/-1; padding: 18px 0 0; border-top: 1px solid rgba(18,50,74,.08); border-left: 0; } }
@media (max-width: 700px) { .applied-page { padding-inline: 16px; }.applied-metrics,.applied-card { grid-template-columns: 1fr; }.applied-journey { padding: 16px; }.applied-journey__head { align-items: start; flex-direction: column; }.applied-card__summary { grid-column: auto; }.applied-hero h1 { font-size: clamp(42px,16vw,64px); } }
@media (prefers-reduced-motion: reduce) { .applied-hero,.applied-metrics div,.applied-card,.applied-empty { animation: none; }.applied-card,.applied-card:hover,.applied-list:has(.applied-card:hover) .applied-card:not(:hover) { opacity: 1; transform: none; transition: none; }.applied-card__link span { transition: none; } }
</style>
