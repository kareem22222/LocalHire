<template>
  <div class="art-card" aria-label="Local jobs illustrated across a city neighbourhood">
    <div class="art-card__grid" aria-hidden="true"></div>
    <div class="orbit orbit--one" aria-hidden="true"></div>
    <div class="orbit orbit--two" aria-hidden="true"></div>

    <div class="job-chip job-chip--sales">
      <span class="job-chip__icon">₹</span>
      <span><small>Now hiring</small><strong>Store Associate</strong></span>
    </div>

    <div class="job-chip job-chip--delivery">
      <span class="job-chip__icon">
        <svg viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
      </span>
      <span><small>3 km away</small><strong>Delivery Partner</strong></span>
    </div>

    <div class="job-chip job-chip--helper">
      <span class="job-chip__icon">
        <svg viewBox="0 0 24 24"><path d="m14.5 5.5 4 4M12 8l4 4-8 8H4v-4zM4 4h6M4 8h4" /></svg>
      </span>
      <span><small>Nearby</small><strong>Kitchen Helper</strong></span>
    </div>

    <svg class="art-city" viewBox="0 0 560 560" aria-hidden="true">
      <defs>
        <linearGradient id="pin-fill" x1="205" y1="112" x2="350" y2="386" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0966ad" />
          <stop offset="1" stop-color="#073f78" />
        </linearGradient>
        <linearGradient id="ground-fill" x1="125" y1="300" x2="440" y2="443" gradientUnits="userSpaceOnUse">
          <stop stop-color="#dceeff" />
          <stop offset="1" stop-color="#dff7e7" />
        </linearGradient>
        <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0c4f81" flood-opacity=".18" />
        </filter>
      </defs>

      <ellipse cx="280" cy="415" rx="170" ry="48" fill="url(#ground-fill)" />
      <path d="M127 408c56-31 99-18 144 2 43 20 87 18 157-15" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" />
      <path d="M199 409c16-13 30-21 46-28M337 413c15-17 31-28 50-35" fill="none" stroke="#7cc798" stroke-width="5" stroke-linecap="round" stroke-dasharray="3 13" />

      <g fill="#fff" stroke="#bdd9e8" stroke-width="3">
        <path d="M143 349h76v69h-76z" />
        <path d="m135 350 46-34 46 34" />
        <path d="M349 335h74v77h-74z" />
        <path d="m341 336 45-35 45 35" />
        <path d="M233 342h96v82h-96z" />
      </g>
      <g fill="#b9ddf5">
        <path d="M160 364h16v18h-16zm28 0h16v18h-16zM365 350h16v18h-16zm27 0h16v18h-16zM250 358h19v20h-19zm43 0h19v20h-19z" />
      </g>
      <g fill="#1bae5c">
        <path d="M177 389h16v29h-16zM374 380h17v32h-17z" />
        <circle cx="120" cy="380" r="19" /><path d="M116 395h8v24h-8z" />
        <circle cx="444" cy="379" r="22" /><path d="M440 396h9v24h-9z" />
      </g>

      <g filter="url(#pin-shadow)">
        <path fill="url(#pin-fill)" d="M280 81c-67 0-120 51-120 116 0 83 120 194 120 194s120-111 120-194c0-65-53-116-120-116Z" />
        <circle cx="280" cy="196" r="65" fill="#fff" />
      </g>

      <g transform="translate(229 143)">
        <circle cx="51" cy="32" r="22" fill="#1bae5c" />
        <path d="M13 100c3-30 18-46 38-46s36 16 39 46" fill="#bcebd0" />
        <path d="M27 99V76h48v23" fill="#fff" stroke="#0c568e" stroke-width="5" stroke-linejoin="round" />
        <path d="M36 76V65c0-8 6-14 15-14 8 0 15 6 15 14v11" fill="none" stroke="#0c568e" stroke-width="5" />
        <path d="M42 84h18" stroke="#1bae5c" stroke-width="5" stroke-linecap="round" />
      </g>

      <g transform="translate(111 270)">
        <circle cx="25" cy="15" r="12" fill="#f1ac7b" />
        <path d="M10 51c2-18 8-27 16-27 9 0 16 9 18 27" fill="#0a5895" />
        <path d="M17 50v29m20-29v29" stroke="#263e55" stroke-width="8" stroke-linecap="round" />
      </g>
      <g transform="translate(404 269)">
        <circle cx="25" cy="15" r="12" fill="#b97855" />
        <path d="M8 51c2-18 8-27 17-27 10 0 17 9 19 27" fill="#1bae5c" />
        <path d="M17 50v29m20-29v29" stroke="#263e55" stroke-width="8" stroke-linecap="round" />
      </g>
    </svg>

    <div class="trust-badge">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 12 3 3 7-7" /></svg>
      <span><strong>Trusted local roles</strong><small>Simple. Relevant. Nearby.</small></span>
    </div>
  </div>
</template>

