<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import '../hiring-dashboard.css'
import {
  EMPLOYMENT_TYPE_LABELS,
  formatEmploymentType,
  formatExperience,
  formatJobLocation,
  formatSalary,
} from '../utils/jobDisplay'
import { moveSpotlight, resetSpotlight } from '../utils/spotlightCard'
import BorderGlow from './BorderGlow.vue'
import CountUp from './CountUp.vue'
import AnimatedCard from './ui/AnimatedCard.vue'
import MessageLoading from './ui/MessageLoading.vue'

const props = defineProps({
  user: { type: Object, default: null },
  jobs: { type: Array, default: () => [] },
  applications: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  locationLabel: { type: String, default: '' },
  locating: { type: Boolean, default: false },
  applying: { type: [String, Number], default: null },
})

const emit = defineEmits([
  'search-jobs',
  'use-my-location',
  'apply',
  'open-profile',
  'open-job',
  'view-applications',
])
const search = ref('')
const employmentType = ref('All')
const employmentTypes = ['All', ...Object.keys(EMPLOYMENT_TYPE_LABELS)]
let searchTimer = null

const profileScore = computed(() => {
  const user = props.user || {}
  if (Number.isFinite(user.profileCompletionPercent)) return user.profileCompletionPercent
  const completed = [
    user.phone,
    user.jobTitle,
    user.experienceYears !== null && user.experienceYears !== undefined,
    user.education,
    user.languages?.length,
    user.cityArea,
    user.state,
    user.pincode,
  ].filter(Boolean).length
  return Math.round(completed / 8 * 100)
})

function searchPayload() {
  return {
    search: search.value.trim(),
    employmentType: employmentType.value === 'All' ? '' : employmentType.value,
  }
}

function runSearch() {
  emit('search-jobs', searchPayload())
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(runSearch, 400)
}

watch(employmentType, runSearch)
onBeforeUnmount(() => clearTimeout(searchTimer))

function hasApplied(jobId) {
  return props.applications.some((application) => application.jobPostId === jobId)
}
</script>

<template>
  <main class="hiring-dashboard worker-dashboard">
    <section class="hiring-metrics">
      <BorderGlow><strong><CountUp :to="jobs.length" separator="" /></strong><span>matching roles</span></BorderGlow>
      <BorderGlow><strong><CountUp :to="applications.length" separator="" /></strong><span>applications</span></BorderGlow>
      <BorderGlow><strong><CountUp :to="profileScore" separator="" suffix="%" /></strong><span>profile score</span></BorderGlow>
    </section>

    <div class="hiring-side-stack">
      <AnimatedCard
        class="hiring-sidebar"
        title="Profile strength"
        description="A complete profile helps local employers understand your experience and skills."
      >
        <div class="hiring-progress">
          <span>Profile score</span>
          <strong><CountUp :to="profileScore" separator="" suffix="%" /></strong>
          <i
            role="progressbar"
            aria-label="Profile score"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="profileScore"
          ><b :style="{ width: `${profileScore}%` }"></b></i>
        </div>
      </AnimatedCard>

      <AnimatedCard
        class="hiring-sidebar hiring-quick"
        title="Quick actions"
        description="Review your applications or keep your work profile current."
        with-arrow
      >
        <div class="hiring-quick__actions">
          <button type="button" class="dash-btn dash-btn--primary" @click="emit('view-applications')">Applied jobs</button>
          <button type="button" class="hiring-quick__link" @click="emit('open-profile')">Update profile</button>
        </div>
      </AnimatedCard>
    </div>

    <section class="worker-jobs">
      <div class="hiring-roles__head">
        <div>
          <span class="hiring-kicker">Looking for work</span>
          <h2>Roles for you</h2>
        </div>
        <span class="worker-results">{{ jobs.length }} results</span>
      </div>

      <form class="worker-search" @submit.prevent="runSearch">
        <div class="worker-search__primary">
          <div class="hiring-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input
              v-model="search"
              type="search"
              placeholder="Search by role, company, area, state, or pincode"
              aria-label="Search jobs by role or location"
              @input="onSearchInput"
            />
          </div>
          <button type="submit" class="dash-btn dash-btn--primary worker-search__submit">Search</button>
        </div>

        <div class="worker-search__filters">
          <label class="worker-search__field">
            <span>Employment type</span>
            <select v-model="employmentType">
              <option v-for="type in employmentTypes" :key="type" :value="type">
                {{ type === 'All' ? type : EMPLOYMENT_TYPE_LABELS[type] }}
              </option>
            </select>
          </label>
          <button type="button" class="worker-search__location" :disabled="locating" @click="emit('use-my-location')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.4-7-11a7 7 0 0 1 14 0c0 4.6-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
            {{ locating ? 'Locating...' : 'Use my location' }}
          </button>
          <span class="worker-search__location-label">{{ locationLabel }}</span>
        </div>
      </form>

      <div v-if="loading" class="candidate-empty">
        <MessageLoading label="Searching roles" />
        <strong>Searching roles...</strong>
        <p>Finding work that matches your filters.</p>
      </div>

      <div v-else-if="jobs.length" class="worker-job-list">
        <article
          v-for="job in jobs"
          :key="job.id"
          class="worker-job-row spotlight-card spotlight-card--worker"
          @pointermove="moveSpotlight"
          @pointerleave="resetSpotlight"
          @pointercancel="resetSpotlight"
        >
          <a
            class="worker-job-row__main"
            :href="`/work/jobs/${job.id}`"
            :aria-label="`View ${job.title} at ${job.workplaceName}`"
            @click.prevent="emit('open-job', job.id)"
          >
            <span class="worker-job-row__status">Now hiring</span>
            <h3>{{ job.title }}</h3>
            <p class="worker-job-row__company">{{ job.workplaceName }} · {{ formatJobLocation(job) }}</p>
            <p class="worker-job-row__description">{{ job.description }}</p>
            <div class="worker-job-row__tags">
              <span v-if="formatEmploymentType(job)">{{ formatEmploymentType(job) }}</span>
              <span v-if="formatSalary(job)">{{ formatSalary(job) }}</span>
              <span v-if="formatExperience(job)">{{ formatExperience(job) }}</span>
            </div>
          </a>
          <div class="worker-job-row__actions">
            <a class="worker-job-row__details" :href="`/work/jobs/${job.id}`" @click.prevent="emit('open-job', job.id)">View details →</a>
            <button
              type="button"
              class="dash-btn dash-btn--primary"
              :disabled="hasApplied(job.id) || applying === job.id"
              @click="emit('apply', job.id)"
            >
              {{ hasApplied(job.id) ? 'Applied' : applying === job.id ? 'Applying...' : 'Apply now' }}
            </button>
          </div>
        </article>
      </div>

      <div v-else class="candidate-empty">
        <strong>No roles found</strong>
        <p>Try another role, area, employment type, or use your current location.</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.worker-dashboard {
  --animated-card-glow: var(--worker-role-gradient);
}

.worker-dashboard :is(.hiring-metrics strong, .hiring-kicker, .hiring-progress strong) {
  color: var(--worker-role-green-text);
}

.worker-dashboard .dash-btn--primary {
  background: var(--worker-role-gradient);
  box-shadow: 0 10px 24px rgba(var(--worker-role-green-rgb), 0.18);
}

.worker-dashboard .hiring-kicker::before,
.worker-dashboard .hiring-progress b {
  background: linear-gradient(90deg, var(--worker-role-green-start), var(--worker-role-green-end));
}

.worker-dashboard .hiring-progress b {
  transform-origin: left;
  animation: profile-progress 1.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes profile-progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@media (prefers-reduced-motion: reduce) {
  .worker-dashboard .hiring-progress b { animation: none; }
}

.worker-dashboard .hiring-quick__link {
  color: var(--worker-role-green-text);
  border-color: rgba(var(--worker-role-green-rgb), 0.2);
}

.worker-results,
.worker-search__location-label {
  color: #526977;
  font-size: 13px;
  font-weight: 700;
}

.worker-jobs {
  display: grid;
  gap: 16px;
}

.worker-search {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgba(18, 50, 74, 0.08);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 12px 40px rgba(var(--worker-role-green-rgb), 0.07);
}

.worker-search__primary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 12px;
}

.worker-search__primary .hiring-search,
.worker-search__submit {
  min-height: 52px;
}

.worker-search__primary .hiring-search:focus-within,
.worker-search__field select:focus {
  border-color: rgba(var(--worker-role-green-rgb), 0.55);
  box-shadow: 0 0 0 4px rgba(var(--worker-role-green-rgb), 0.1);
}

.worker-search__primary .hiring-search svg {
  color: var(--worker-role-green-text);
}

.worker-search__filters {
  display: grid;
  grid-template-columns: minmax(210px, 260px) auto minmax(0, 1fr);
  gap: 12px;
  align-items: end;
  padding-top: 16px;
  border-top: 1px solid rgba(18, 50, 74, 0.08);
}

.worker-search__field {
  display: grid;
  gap: 7px;
}

.worker-search__field > span {
  padding-left: 3px;
  color: #526977;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.worker-search__field select,
.worker-search__location {
  height: 44px;
  padding: 0 14px;
  border: 1.5px solid rgba(18, 50, 74, 0.12);
  border-radius: 12px;
  background: #ffffff;
  color: #12324a;
  outline: none;
}

.worker-search__location {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--worker-role-green-text);
  border-color: rgba(var(--worker-role-green-rgb), 0.28);
  font-weight: 800;
}

.worker-search__location svg {
  width: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.worker-search__location-label {
  align-self: center;
  text-align: right;
}

.worker-job-list {
  display: grid;
  gap: 12px;
}

.worker-job-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;
  padding: 24px;
  border: 1px solid rgba(18, 50, 74, 0.08);
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 10px 32px rgba(18, 50, 74, 0.05);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.worker-job-row__main {
  color: inherit;
  text-decoration: none;
}

.worker-job-row:hover {
  transform: perspective(900px) rotateX(var(--spotlight-rx)) rotateY(var(--spotlight-ry)) translateY(-2px);
  border-color: rgba(var(--worker-role-green-rgb), 0.3);
  box-shadow: 0 16px 36px rgba(var(--worker-role-green-rgb), 0.1);
}

.worker-job-row :is(a:focus-visible, button:focus-visible) {
  outline: 3px solid rgba(var(--worker-role-green-rgb), 0.25);
  outline-offset: 2px;
}

.worker-job-row__status {
  display: inline-flex;
  margin-bottom: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(var(--worker-role-green-rgb), 0.09);
  color: var(--worker-role-green-text);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.worker-job-row h3 {
  color: #0b3658;
  font-family: Manrope, sans-serif;
  font-size: 21px;
}

.worker-job-row__company,
.worker-job-row__description {
  color: #526977;
  font-size: 14px;
}

.worker-job-row__company {
  margin-top: 5px;
  font-weight: 600;
}

.worker-job-row__description {
  display: -webkit-box;
  max-width: 720px;
  margin-top: 10px;
  overflow: hidden;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.worker-job-row__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 14px;
}

.worker-job-row__tags span {
  padding: 6px 10px;
  border-radius: 999px;
  background: #f1f7f3;
  color: #376150;
  font-size: 12px;
  font-weight: 700;
}

.worker-job-row__actions {
  display: grid;
  justify-items: end;
  gap: 14px;
}

.worker-job-row__details {
  color: var(--worker-role-green-text);
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

@media (max-width: 720px) {
  .worker-search__primary,
  .worker-search__filters,
  .worker-job-row {
    grid-template-columns: 1fr;
  }

  .worker-search__location-label {
    text-align: left;
  }

  .worker-job-row__actions {
    justify-items: stretch;
  }

  .worker-job-row__details {
    display: none;
  }
}
</style>
