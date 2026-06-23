<script setup>
import BrandLogo from './components/BrandLogo.vue'
import HeroArtwork from './components/HeroArtwork.vue'
</script>

<template>
  <main class="site-shell">
    <div class="ambient ambient--blue" aria-hidden="true"></div>
    <div class="ambient ambient--green" aria-hidden="true"></div>

    <header class="site-header">
      <BrandLogo />
      <div class="launch-pill">
        <span class="launch-pill__dot"></span>
        Coming soon
      </div>
    </header>

    <section class="hero">
      <div class="hero__copy">
        <p class="eyebrow"><span>●</span> Built for local ambition</p>
        <h1>Good work,<br /><span>closer to home.</span></h1>
        <p class="hero__intro">
          LocalHire is bringing trusted opportunities and local talent together—across
          India’s growing cities and neighbourhoods.
        </p>

        <div class="audience" aria-label="Who LocalHire is for">
          <div class="audience-card audience-card--blue">
            <span class="audience-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" /></svg>
            </span>
            <span><strong>I’m looking for work</strong><small>Find the right job nearby</small></span>
          </div>
          <div class="audience-card audience-card--green">
            <span class="audience-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 8.5h16v11H4zM9 8.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2.5M4 13h16M10 13v2h4v-2" /></svg>
            </span>
            <span><strong>I’m hiring locally</strong><small>Meet dependable people</small></span>
          </div>
        </div>

        <div class="launch-note">
          <div class="avatar-stack" aria-hidden="true">
            <span>R</span><span>S</span><span>A</span>
          </div>
          <p><strong>Launching soon</strong><br />in cities where talent is already thriving.</p>
        </div>
      </div>

      <div class="hero__visual">
        <HeroArtwork />
      </div>
    </section>

    <footer class="site-footer">
      <p>© {{ new Date().getFullYear() }} LocalHire</p>
      <p>Local jobs. Local talent. Real possibilities.</p>
    </footer>
  </main>
</template>

