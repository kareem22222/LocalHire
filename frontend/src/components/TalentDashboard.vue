<script setup>
import { computed, ref } from 'vue'

const query = ref('')
const city = ref('All')
const category = ref('All')
const shift = ref('All')

const jobs = [
  {
    id: 1,
    title: 'Store Associate',
    company: 'FreshMart Retail',
    city: 'Bengaluru',
    area: 'Indiranagar',
    category: 'Retail',
    shift: 'Day',
    pay: 'Rs 18k - 24k',
    distance: '2.1 km',
    match: 96,
    posted: 'Today',
    tags: ['Customer handling', 'Billing', 'Inventory'],
  },
  {
    id: 2,
    title: 'Delivery Partner',
    company: 'SwiftLocal',
    city: 'Hyderabad',
    area: 'Madhapur',
    category: 'Delivery',
    shift: 'Flexible',
    pay: 'Rs 22k - 35k',
    distance: '3.4 km',
    match: 92,
    posted: '2h ago',
    tags: ['Bike required', 'Weekly payout', 'Local route'],
  },
  {
    id: 3,
    title: 'Front Desk Executive',
    company: 'UrbanCare Clinic',
    city: 'Chennai',
    area: 'T Nagar',
    category: 'Office',
    shift: 'Day',
    pay: 'Rs 20k - 28k',
    distance: '1.8 km',
    match: 89,
    posted: 'Today',
    tags: ['Reception', 'Appointments', 'Basic computer'],
  },
  {
    id: 4,
    title: 'Kitchen Helper',
    company: 'Spice Junction',
    city: 'Pune',
    area: 'Koregaon Park',
    category: 'Food',
    shift: 'Evening',
    pay: 'Rs 16k - 21k',
    distance: '4.0 km',
    match: 85,
    posted: 'Yesterday',
    tags: ['Food prep', 'Cleaning', 'Staff meals'],
  },
  {
    id: 5,
    title: 'Salon Assistant',
    company: 'Glow Studio',
    city: 'Bengaluru',
    area: 'Koramangala',
    category: 'Beauty',
    shift: 'Day',
    pay: 'Rs 15k - 22k',
    distance: '2.7 km',
    match: 83,
    posted: 'Today',
    tags: ['Client support', 'Training', 'Incentives'],
  },
]

const cities = computed(() => ['All', ...new Set(jobs.map(job => job.city))])
const categories = computed(() => ['All', ...new Set(jobs.map(job => job.category))])
const shifts = ['All', 'Day', 'Evening', 'Flexible']

const filteredJobs = computed(() => {
  const text = query.value.trim().toLowerCase()
  return jobs.filter(job => {
    const matchesText = !text || [job.title, job.company, job.area, job.category, ...job.tags]
      .join(' ')
      .toLowerCase()
      .includes(text)
    const matchesCity = city.value === 'All' || job.city === city.value
    const matchesCategory = category.value === 'All' || job.category === category.value
    const matchesShift = shift.value === 'All' || job.shift === shift.value
    return matchesText && matchesCity && matchesCategory && matchesShift
  })
})

const topJob = computed(() => filteredJobs.value[0] || jobs[0])

function applyJob(job) {
  query.value = job.title
}
</script>

<template>
  <main class="dash-main dash-main--jobs">
    <section class="job-hero">
      <div class="job-hero__copy">
        <span class="job-kicker">Find local work</span>
        <h1 class="job-hero__title">
          Search nearby jobs that match your skills.
        </h1>
        <p class="job-hero__desc">
          Browse verified local roles, compare pay, distance, shift timing, and apply faster.
        </p>
      </div>

      <div class="job-feature-card">
        <span class="job-feature-card__label">Best match now</span>
        <strong>{{ topJob.match }}%</strong>
        <p>{{ topJob.title }} at {{ topJob.company }}</p>
        <small>{{ topJob.area }}, {{ topJob.city }} - {{ topJob.distance }}</small>
      </div>
    </section>

    <section class="job-search-panel" aria-label="Search local jobs">
      <div class="job-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="query" type="search" placeholder="Search role, company, area, or skill" aria-label="Search jobs" />
      </div>

      <div class="job-filters">
        <label>
          <span>City</span>
          <select v-model="city">
            <option v-for="item in cities" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select v-model="category">
            <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <label>
          <span>Shift</span>
          <select v-model="shift">
            <option v-for="item in shifts" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
      </div>
    </section>

    <section class="job-stats" aria-label="Job search summary">
      <div>
        <strong>{{ filteredJobs.length }}</strong>
        <span>matching roles</span>
      </div>
      <div>
        <strong>18</strong>
        <span>active cities</span>
      </div>
      <div>
        <strong>15 min</strong>
        <span>avg match time</span>
      </div>
    </section>

    <section class="jobs-layout">
      <aside class="jobs-sidebar" aria-label="Search tips">
        <h2>Profile boost</h2>
        <div class="profile-score">
          <span>78%</span>
          <div><i style="width: 78%"></i></div>
        </div>
        <p>Add your preferred area and last work experience to improve matches.</p>
        <button type="button">Complete profile</button>
      </aside>

      <div class="job-results">
        <div class="job-results__head">
          <div>
            <span class="job-kicker">Recommended</span>
            <h2>Local jobs near you</h2>
          </div>
          <span>{{ filteredJobs.length }} results</span>
        </div>

        <article v-for="job in filteredJobs" :key="job.id" class="job-card">
          <div class="job-card__main">
            <div class="job-card__badge">{{ job.match }}%</div>
            <div>
              <div class="job-card__topline">
                <h3>{{ job.title }}</h3>
                <span>{{ job.posted }}</span>
              </div>
              <p>{{ job.company }} - {{ job.area }}, {{ job.city }}</p>
              <div class="job-card__meta">
                <span>{{ job.pay }}</span>
                <span>{{ job.distance }}</span>
                <span>{{ job.shift }} shift</span>
              </div>
              <div class="job-card__tags">
                <span v-for="tag in job.tags" :key="tag">{{ tag }}</span>
              </div>
            </div>
          </div>
          <button type="button" class="job-card__apply" @click="applyJob(job)">View job</button>
        </article>

        <div v-if="!filteredJobs.length" class="job-empty">
          <strong>No local jobs found</strong>
          <p>Try another city, shift, or skill keyword.</p>
        </div>
      </div>
    </section>
  </main>
</template>
