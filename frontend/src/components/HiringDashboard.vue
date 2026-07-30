<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import '../hiring-dashboard.css'
import { useOpenRoles } from '../composables/useOpenRoles'
import { useSavedCandidates } from '../composables/useSavedCandidates'
import { MAX_VISIBLE_CANDIDATES, MAX_VISIBLE_ROLES } from '../utils/jobDisplay'
import AnimatedList from './AnimatedList.vue'
import BorderGlow from './BorderGlow.vue'
import CandidateCard from './CandidateCard.vue'
import CountUp from './CountUp.vue'
import RoleCard from './RoleCard.vue'
import AnimatedCard from './ui/AnimatedCard.vue'
import SkeletonShimmer from './ui/SkeletonShimmer.vue'

const props = defineProps({
  myJobs: { type: Array, default: () => [] },
  rolesLoading: { type: Boolean, default: false },
  candidates: { type: Array, default: () => [] },
  candidatesLoading: { type: Boolean, default: false },
  locationLabel: { type: String, default: '' },
  locating: { type: Boolean, default: false },
})

const emit = defineEmits([
  'open-create-job',
  'view-applications',
  'view-applicants',
  'view-shortlisted',
  'open-candidate',
  'shortlist',
  'contact',
  'review-shortlists',
  'view-job',
  'search-candidates',
  'use-my-location',
  'view-all-roles',
  'view-all-candidates',
])

const search = ref('')
const role = ref('All')

// Curated roles employers commonly hire for. Kept in sync with the roles used to
// seed worker profiles so selecting one returns real matches.
const roles = [
  'All',
  'Store Associate',
  'Delivery Partner',
  'Cashier',
  'Warehouse Picker',
  'Security Guard',
  'Office Assistant',
  'Customer Support Executive',
  'Housekeeping Staff',
  'Kitchen Helper',
  'Cafe Server',
  'Driver',
  'Electrician',
  'Plumber',
  'Sales Associate',
  'Data Entry Operator',
  'Receptionist',
  'Tailor',
  'Machine Operator',
  'Pharmacy Assistant',
  'Field Technician',
]

let searchTimer = null

// The search/role pair the backend expects. Reused by the live search and by the
// "show all" navigation so the dedicated page mirrors the dashboard's filters.
function currentSearchPayload() {
  return {
    search: search.value.trim(),
    role: role.value === 'All' ? '' : role.value,
  }
}

function runServerSearch() {
  emit('search-candidates', currentSearchPayload())
}

// Debounce keystrokes so the address search hits the backend once the employer
// pauses typing, while the client-side filter below keeps the list responsive.
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(runServerSearch, 400)
}

function submitSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  runServerSearch()
}

watch(role, runServerSearch)

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

const openRoles = useOpenRoles(() => props.myJobs)
const { isSaved, add: saveCandidate } = useSavedCandidates()
const pipelineHealth = computed(() => {
  const applicants = openRoles.value.reduce((total, job) => total + job.applicants, 0)
  if (!applicants) return 0
  const shortlisted = openRoles.value.reduce((total, job) => total + job.shortlisted, 0)
  return Math.round(shortlisted * 100 / applicants)
})

// Instant client-side refinement over whatever the backend last returned, so the
// list narrows as the employer types even before the debounced request lands.
const filteredCandidates = computed(() => {
  const text = search.value.trim().toLowerCase()
  return props.candidates.filter((candidate) => {
    const matchesText = !text || [
      candidate.name,
      candidate.role,
      candidate.area,
      candidate.state,
      candidate.pincode,
    ].filter(Boolean).join(' ').toLowerCase().includes(text)
    const matchesRole = role.value === 'All' || candidate.role === role.value
    return matchesText && matchesRole
  })
})

// Only the first slice is shown on the dashboard; the rest live on a dedicated
// page reachable through the "Show more" buttons below.
const visibleRoles = computed(() => openRoles.value.slice(0, MAX_VISIBLE_ROLES))
const hasMoreRoles = computed(() => openRoles.value.length > MAX_VISIBLE_ROLES)

const visibleCandidates = computed(() => filteredCandidates.value.slice(0, MAX_VISIBLE_CANDIDATES))
const hasMoreCandidates = computed(() => filteredCandidates.value.length > MAX_VISIBLE_CANDIDATES)

function showAllRoles() {
  emit('view-all-roles')
}

function showAllCandidates() {
  emit('view-all-candidates', currentSearchPayload())
}

function shortlist(candidate) {
  saveCandidate(candidate.id)
  emit('shortlist', candidate)
}

function contact(candidate) {
  emit('contact', candidate)
}

function openCandidate(candidate) {
  emit('open-candidate', candidate)
}
</script>

<template>
  <main class="hiring-dashboard">
      <section class="hiring-metrics">
        <BorderGlow>
          <strong><CountUp :to="filteredCandidates.length" separator="" /></strong>
          <span>matching candidates</span>
        </BorderGlow>
        <BorderGlow>
          <strong><CountUp :to="openRoles.length" separator="" /></strong>
          <span>open hiring roles</span>
        </BorderGlow>
        <BorderGlow>
          <strong><CountUp :to="24" separator="" suffix="h" /></strong>
          <span>avg response time</span>
        </BorderGlow>
      </section>

      <div class="hiring-side-stack">
        <AnimatedCard
          class="hiring-sidebar"
          title="Hiring pipeline"
          description="Move fast: shortlist high-match candidates, schedule interviews, and keep the role status current."
        >
          <div class="hiring-progress">
            <span>Pipeline health</span>
            <strong>{{ pipelineHealth }}%</strong>
            <i role="progressbar" aria-label="Pipeline health" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="pipelineHealth">
              <b :style="{ width: `${pipelineHealth}%` }"></b>
            </i>
          </div>
        </AnimatedCard>

        <AnimatedCard
          class="hiring-sidebar hiring-quick"
          title="Quick actions"
          description="Jump straight into the work that keeps candidates moving."
          with-arrow
        >
          <div class="hiring-quick__actions">
            <button type="button" class="dash-btn dash-btn--primary" @click="emit('open-create-job')">Post new role</button>
            <button type="button" class="hiring-quick__link" @click="emit('review-shortlists')">Review shortlists</button>
            <button type="button" class="hiring-quick__link">Schedule interviews</button>
          </div>
        </AnimatedCard>
      </div>

    <section class="hiring-roles" :aria-busy="rolesLoading">
      <div class="hiring-roles__head">
        <div>
          <span class="hiring-kicker">Hiring desk</span>
          <h2>Open roles you are hiring for</h2>
        </div>
      </div>

      <SkeletonShimmer v-if="rolesLoading" variant="role" :count="visibleRoles.length || 3" label="Loading roles" />
      <template v-else>
        <div class="hiring-role-grid">
          <RoleCard
            v-for="item in visibleRoles"
            :key="item.id || item.title"
            :item="item"
            action-label="View Summary"
            counts-clickable
            @view="emit('view-job', $event)"
            @action="emit('view-applications', $event)"
            @view-applicants="emit('view-applicants', $event)"
            @view-shortlisted="emit('view-shortlisted', $event)"
          />
        </div>
        <div v-if="hasMoreRoles" class="hiring-show-more">
          <button type="button" class="hiring-show-more__btn" @click="showAllRoles">
            Show more roles ({{ openRoles.length }} total)
          </button>
        </div>
        <div v-if="!openRoles.length" class="candidate-empty">
          <strong>No open roles yet</strong>
          <p>Post a role to start tracking applicants and matches.</p>
        </div>
      </template>
    </section>

    <section class="candidate-list" :aria-busy="candidatesLoading">
      <div class="candidate-list__head">
        <div>
          <span class="hiring-kicker">Recommended</span>
          <h2>Talent near your business</h2>
        </div>
        <span>{{ filteredCandidates.length }} results</span>
      </div>

      <div class="talent-search">
        <form class="talent-search__form" @submit.prevent="submitSearch">
          <div class="talent-search__bar">
            <div class="hiring-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input
                v-model="search"
                type="search"
                placeholder="Search by area, city, pincode, name, or role"
                aria-label="Search candidates by address or role"
                @input="onSearchInput"
              />
            </div>
            <button type="submit" class="dash-btn dash-btn--primary talent-search__go">Search</button>
          </div>

          <div class="talent-search__filters">
            <label class="talent-search__role">
              <span>Filter by role</span>
              <select v-model="role">
                <option v-for="item in roles" :key="item" :value="item">{{ item }}</option>
              </select>
            </label>

            <button
              type="button"
              class="talent-search__location"
              :disabled="locating"
              @click="emit('use-my-location')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.4-7-11a7 7 0 0 1 14 0c0 4.6-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
              {{ locating ? 'Locating...' : 'Use my location' }}
            </button>

            <span v-if="locationLabel" class="talent-search__label">{{ locationLabel }}</span>
          </div>
        </form>
      </div>

      <SkeletonShimmer v-if="candidatesLoading" label="Searching talent" />

      <template v-else>
        <AnimatedList
          v-if="visibleCandidates.length"
          :items="visibleCandidates"
          class="dashboard-animated-list"
          @select="openCandidate"
        >
          <template #default="{ item: candidate }">
            <CandidateCard
              :candidate="candidate"
              :shortlisted="isSaved(candidate.id)"
              @shortlist="shortlist"
              @contact="contact"
              @select="openCandidate"
            />
          </template>
        </AnimatedList>
        <div v-if="hasMoreCandidates" class="hiring-show-more">
          <button type="button" class="hiring-show-more__btn" @click="showAllCandidates">
            Show more candidates ({{ filteredCandidates.length }} total)
          </button>
        </div>

        <div v-if="!filteredCandidates.length" class="candidate-empty">
          <strong>No talent found</strong>
          <p>Try a wider area search, a different role, or use your location.</p>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.talent-search {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(18, 50, 74, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 12px 40px rgba(7, 85, 154, 0.07);
}

.talent-search__form {
  display: grid;
  gap: 14px;
}

/* Row 1: the search field owns the full width with the action button beside it,
   so the role filter is no longer crammed into the search line. */
.talent-search__bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: stretch;
}

.talent-search__go {
  height: 100%;
  min-height: 52px;
  padding: 0 26px;
  white-space: nowrap;
}

/* Row 2: filters sit on their own line, clearly separated from the search box. */
.talent-search__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid rgba(18, 50, 74, 0.08);
}

.talent-search__role {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.talent-search__role span {
  color: #5d7482;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.talent-search__role select {
  height: 42px;
  min-width: 190px;
  padding: 0 13px;
  color: #12324a;
  border: 1.5px solid rgba(18, 50, 74, 0.1);
  border-radius: 13px;
  background: #ffffff;
  outline: none;
}

.talent-search__role select:focus {
  border-color: rgba(7, 85, 154, 0.55);
  box-shadow: 0 0 0 4px rgba(7, 85, 154, 0.1);
}

.talent-search__location {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  color: #07559a;
  border: 1.5px solid rgba(7, 85, 154, 0.25);
  border-radius: 12px;
  background: #ffffff;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.talent-search__location:hover:not(:disabled) {
  background: rgba(7, 85, 154, 0.08);
  border-color: rgba(7, 85, 154, 0.45);
}

.talent-search__location:disabled {
  opacity: 0.6;
  cursor: default;
}

.talent-search__location svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.talent-search__label {
  margin-left: auto;
  color: #6f8794;
  font-size: 13px;
  font-weight: 700;
}

/* Shared "Show more" affordance under the roles grid and candidate list. */
.hiring-show-more {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.hiring-show-more__btn {
  padding: 12px 24px;
  color: #07559a;
  border: 1.5px solid rgba(7, 85, 154, 0.28);
  border-radius: 999px;
  background: #ffffff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.hiring-show-more__btn:hover {
  background: rgba(7, 85, 154, 0.08);
  border-color: rgba(7, 85, 154, 0.5);
}

@media (max-width: 640px) {
  .talent-search__bar {
    grid-template-columns: 1fr;
  }

  .talent-search__role {
    width: 100%;
  }

  .talent-search__role select {
    flex: 1;
  }

  .talent-search__label {
    margin-left: 0;
    width: 100%;
  }
}

</style>
