<script setup>
import { computed, ref } from 'vue'
import '../styles/hiring-dashboard.css'

const search = ref('')
const role = ref('All')
const availability = ref('All')

const openRoles = [
  { title: 'Store Associate', area: 'Indiranagar', applicants: 18, shortlisted: 6, status: 'Actively hiring' },
  { title: 'Delivery Partner', area: 'Madhapur', applicants: 24, shortlisted: 8, status: 'Interviews today' },
  { title: 'Front Desk Executive', area: 'T Nagar', applicants: 11, shortlisted: 4, status: 'New matches' },
]

const candidates = [
  {
    id: 1,
    name: 'Ananya Rao',
    role: 'Store Associate',
    area: 'Indiranagar',
    city: 'Bengaluru',
    availability: 'Immediate',
    experience: '2 yrs',
    match: 96,
    rate: 'Rs 22k/mo',
    skills: ['Billing', 'Customer support', 'Inventory'],
  },
  {
    id: 2,
    name: 'Rahul Mehta',
    role: 'Delivery Partner',
    area: 'Madhapur',
    city: 'Hyderabad',
    availability: 'This week',
    experience: '3 yrs',
    match: 91,
    rate: 'Rs 28k/mo',
    skills: ['Local routes', 'Bike license', 'Cash handling'],
  },
  {
    id: 3,
    name: 'Sneha Iyer',
    role: 'Front Desk Executive',
    area: 'T Nagar',
    city: 'Chennai',
    availability: 'Immediate',
    experience: '4 yrs',
    match: 89,
    rate: 'Rs 26k/mo',
    skills: ['Appointments', 'MS Office', 'Reception'],
  },
  {
    id: 4,
    name: 'Karthik S',
    role: 'Kitchen Helper',
    area: 'Koregaon Park',
    city: 'Pune',
    availability: 'Next week',
    experience: '1 yr',
    match: 84,
    rate: 'Rs 18k/mo',
    skills: ['Prep work', 'Cleaning', 'Evening shift'],
  },
]

const roles = computed(() => ['All', ...new Set(candidates.map(candidate => candidate.role))])
const availabilityOptions = ['All', 'Immediate', 'This week', 'Next week']

const filteredCandidates = computed(() => {
  const text = search.value.trim().toLowerCase()
  return candidates.filter(candidate => {
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
  search.value = candidate.name
}
</script>

<template>
  <main class="hiring-dashboard">
    <section class="hiring-hero">
      <div>
        <span class="hiring-kicker">Hiring dashboard</span>
        <h1>Hire reliable nearby people faster.</h1>
        <p>
          Manage open roles, search verified local candidates, shortlist strong matches, and move interviews forward.
        </p>
      </div>

      <div class="hiring-hero-card">
        <span>Hiring pipeline</span>
        <strong>42</strong>
        <p>qualified candidates available this week</p>
      </div>
    </section>

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

    <section class="hiring-roles">
      <div class="hiring-roles__head">
        <div>
          <span class="hiring-kicker">Hiring desk</span>
          <h2>Open roles you are hiring for</h2>
        </div>
        <button type="button">Post new role</button>
      </div>

      <div class="hiring-role-grid">
        <article v-for="item in openRoles" :key="item.title" class="hiring-role-card">
          <span>{{ item.status }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.area }}</p>
          <div>
            <strong>{{ item.applicants }}</strong>
            <small>applicants</small>
            <strong>{{ item.shortlisted }}</strong>
            <small>shortlisted</small>
          </div>
        </article>
      </div>
    </section>

    <section class="hiring-layout">
      <aside class="hiring-sidebar">
        <h2>Hiring pipeline</h2>
        <p>Move fast: shortlist high-match candidates, schedule interviews, and keep the role status current.</p>
        <div class="hiring-progress">
          <span>Pipeline health</span>
          <strong>88%</strong>
          <i><b></b></i>
        </div>
      </aside>

      <div class="candidate-list">
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
      </div>
    </section>
  </main>
</template>
