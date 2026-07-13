<script setup>
import { computed, ref } from 'vue'
import '../hiring-dashboard.css'

const props = defineProps({
  myJobs: { type: Array, default: () => [] },
  candidates: { type: Array, default: () => [] },
})

const emit = defineEmits(['open-create-job', 'view-applications', 'shortlist', 'view-job'])

const search = ref('')
const role = ref('All')
const availability = ref('All')

const candidates = computed(() => props.candidates)

const roles = computed(() => ['All', ...new Set(candidates.value.map((candidate) => candidate.role))])
const availabilityOptions = ['All', 'Immediate', 'This week', 'Next week']

const openRoles = computed(() => {
  return props.myJobs.map((job) => {
    const applicants = job.applicationCount ?? 0
    return {
      id: job.id,
      title: job.title,
      area: [job.cityArea, job.state].filter(Boolean).join(', '),
      workplaceName: job.workplaceName,
      applicants,
      shortlisted: Math.min(Math.round(applicants * 0.35), applicants),
      status: job.isActive === false ? 'Inactive' : applicants > 0 ? 'Review applicants' : 'New role',
      isBackendJob: true,
    }
  })
})

const filteredCandidates = computed(() => {
  const text = search.value.trim().toLowerCase()
  return candidates.value.filter((candidate) => {
    const matchesText = !text || [
      candidate.name,
      candidate.role,
      candidate.area,
      candidate.city,
      ...candidate.skills,
    ].join(' ').toLowerCase().includes(text)
    const matchesRole = role.value === 'All' || candidate.role === role.value
    const matchesAvailability = availability.value === 'All' || candidate.availability === availability.value
    return matchesText && matchesRole && matchesAvailability
  })
})

function shortlist(candidate) {
  emit('shortlist', candidate)
}
</script>

<template>
  <main class="hiring-dashboard">
    <section class="hiring-search-panel">
        <div class="hiring-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input v-model="search" type="search" placeholder="Search candidate, role, area, or skill" aria-label="Search candidates" />
        </div>

        <label>
          <span>Role</span>
          <select v-model="role">
            <option v-for="item in roles" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          <span>Availability</span>
          <select v-model="availability">
            <option v-for="item in availabilityOptions" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
      </section>

      <section class="hiring-metrics">
        <div>
          <strong>{{ filteredCandidates.length }}</strong>
          <span>matching candidates</span>
        </div>
        <div>
          <strong>{{ openRoles.length }}</strong>
          <span>open hiring roles</span>
        </div>
        <div>
          <strong>24h</strong>
          <span>avg response time</span>
        </div>
      </section>

      <div class="hiring-side-stack">
        <aside class="hiring-sidebar">
          <h2>Hiring pipeline</h2>
          <p>Move fast: shortlist high-match candidates, schedule interviews, and keep the role status current.</p>
          <div class="hiring-progress">
            <span>Pipeline health</span>
            <strong>88%</strong>
            <i><b></b></i>
          </div>
        </aside>

        <aside class="hiring-sidebar hiring-quick">
          <h2>Quick actions</h2>
          <p>Jump straight into the work that keeps candidates moving.</p>
          <div class="hiring-quick__actions">
            <button type="button" class="dash-btn dash-btn--primary" @click="emit('open-create-job')">Post new role</button>
            <button type="button" class="hiring-quick__link">Review shortlists</button>
            <button type="button" class="hiring-quick__link">Schedule interviews</button>
          </div>
        </aside>
      </div>

    <section class="hiring-roles">
      <div class="hiring-roles__head">
        <div>
          <span class="hiring-kicker">Hiring desk</span>
          <h2>Open roles you are hiring for</h2>
        </div>
      </div>

      <div class="hiring-role-grid">
        <article v-for="item in openRoles" :key="item.id || item.title" class="hiring-role-card">
          <div v-if="item.isBackendJob" class="hiring-role-card__actions">
            <button
              type="button"
              class="hiring-role-card__icon"
              :aria-label="`View details for ${item.title}`"
              title="View details"
              @click="emit('view-job', item.id)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <span>{{ item.status }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.workplaceName ? `${item.workplaceName} - ${item.area}` : item.area }}</p>
          <div>
            <strong>{{ item.applicants }}</strong>
            <small>applicants</small>
            <strong>{{ item.shortlisted }}</strong>
            <small>shortlisted</small>
          </div>
          <button v-if="item.isBackendJob" type="button" class="hiring-role-card__link" @click="emit('view-applications', item.id)">
            View applications
          </button>
        </article>
      </div>
      <div v-if="!openRoles.length" class="candidate-empty">
        <strong>No open roles yet</strong>
        <p>Post a role to start tracking applicants and matches.</p>
      </div>
    </section>

    <section class="candidate-list">
      <div class="candidate-list__head">
        <div>
          <span class="hiring-kicker">Recommended</span>
          <h2>Talent near your business</h2>
        </div>
        <span>{{ filteredCandidates.length }} results</span>
      </div>

      <article v-for="candidate in filteredCandidates" :key="candidate.id" class="candidate-card">
        <div class="candidate-card__avatar">{{ candidate.name.slice(0, 1) }}</div>
        <div class="candidate-card__body">
          <div class="candidate-card__top">
            <div>
              <h3>{{ candidate.name }}</h3>
              <p>{{ candidate.role }} - {{ candidate.area }}, {{ candidate.city }}</p>
            </div>
            <span>{{ candidate.match }}% match</span>
          </div>

          <div class="candidate-card__meta">
            <span>{{ candidate.experience }}</span>
            <span>{{ candidate.availability }}</span>
            <span>{{ candidate.rate }}</span>
          </div>

          <div class="candidate-card__skills">
            <span v-for="skill in candidate.skills" :key="skill">{{ skill }}</span>
          </div>
        </div>
        <div class="candidate-actions">
          <button type="button" @click="shortlist(candidate)">Shortlist</button>
          <button type="button" class="candidate-actions__ghost">Interview</button>
        </div>
      </article>

      <div v-if="!filteredCandidates.length" class="candidate-empty">
        <strong>No talent found</strong>
        <p>Try a wider role, availability, or area search.</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.hiring-role-card {
  position: relative;
}

.hiring-role-card__actions {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  margin: 0;
  grid-template-columns: none;
}

.hiring-role-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid rgba(7, 85, 154, 0.18);
  border-radius: 10px;
  background: #fff;
  color: #07559a;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.hiring-role-card__icon:hover {
  background: rgba(7, 85, 154, 0.08);
  border-color: rgba(7, 85, 154, 0.35);
}

.hiring-role-card__icon svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
