<script setup>
import '../styles/profile-dashboard.css'

defineProps({
  user: {
    type: Object,
    default: null,
  },
})
</script>

<template>
  <main class="profile-dashboard">
    <section class="profile-hero">
      <div class="profile-identity">
        <div class="profile-avatar">{{ (user?.name || 'U').slice(0, 1) }}</div>
        <div>
          <span class="profile-kicker">My profile</span>
          <h1>{{ user?.name || 'User' }}</h1>
          <p>{{ user?.email || 'Complete your account details to improve matches.' }}</p>
        </div>
      </div>

      <div class="profile-score-card">
        <span>Profile strength</span>
        <strong>78%</strong>
        <p>Add work history and preferred area to unlock better recommendations.</p>
      </div>
    </section>

    <section class="profile-grid">
      <article class="profile-panel">
        <div class="profile-panel__head">
          <h2>Personal details</h2>
          <button type="button">Edit</button>
        </div>
        <dl class="profile-details">
          <div>
            <dt>Full name</dt>
            <dd>{{ user?.name || 'Not added' }}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{{ user?.email || 'Not added' }}</dd>
          </div>
          <div>
            <dt>Preferred city</dt>
            <dd>Bengaluru</dd>
          </div>
          <div>
            <dt>Availability</dt>
            <dd>Immediate</dd>
          </div>
        </dl>
      </article>

      <article class="profile-panel">
        <div class="profile-panel__head">
          <h2>Work preferences</h2>
          <button type="button">Update</button>
        </div>
        <div class="profile-tags">
          <span>Retail</span>
          <span>Front desk</span>
          <span>Day shift</span>
          <span>Within 5 km</span>
          <span>Rs 20k+</span>
        </div>
      </article>

      <article class="profile-panel profile-panel--wide">
        <div class="profile-panel__head">
          <h2>Recent activity</h2>
          <button type="button">View all</button>
        </div>
        <div class="profile-timeline">
          <div>
            <span></span>
            <p><strong>Store Associate</strong> saved for later</p>
            <small>Today</small>
          </div>
          <div>
            <span></span>
            <p><strong>Delivery Partner</strong> viewed in Hyderabad</p>
            <small>Yesterday</small>
          </div>
          <div>
            <span></span>
            <p><strong>Profile boost</strong> recommendation added</p>
            <small>2 days ago</small>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>
