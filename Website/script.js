/**
 * MOD ASSISTANT - OFFICIAL WEBSITE SCRIPT
 * Dreftian Devs · Interactive Rank Changer & Dynamic Showcase
 */

document.addEventListener('DOMContentLoaded', () => {
  initBackgroundCanvas();
  initFaqAccordion();
  initRankChanger();
});

/* ==========================================================================
   BACKGROUND CANVAS (Dota 2 Floating Embers)
   ========================================================================== */
function initBackgroundCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const PARTICLE_COUNT = 45;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.6,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(Math.random() * 0.6 + 0.2),
      alpha: Math.random() * 0.7 + 0.2,
      color: Math.random() > 0.6 ? '#ffd700' : (Math.random() > 0.5 ? '#e63946' : '#00e5ff'),
    });
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.y < 0) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    requestAnimationFrame(animate);
  }

  animate();
}

/* ==========================================================================
   FAQ ACCORDION
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const questionBtn = item.querySelector('.faq-question');
    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach((other) => other.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });
}

/* ==========================================================================
   INTERACTIVE RANK & HERO BADGE CHANGER
   ========================================================================== */
const RANK_MEDALS = [
  { id: '0', name: 'Sin Calibrar', tier: 'free', mmr: '—', hasStars: false, isImmortal: false, color: '#7a8288' },
  { id: '1', name: 'Heraldo', tier: 'free', mmr: '500', hasStars: true, isImmortal: false, color: '#90a4ae' },
  { id: '2', name: 'Guardián', tier: 'free', mmr: '1,200', hasStars: true, isImmortal: false, color: '#81c784' },
  { id: '3', name: 'Cruzado', tier: 'free', mmr: '2,000', hasStars: true, isImmortal: false, color: '#4dd0e1' },
  { id: '4', name: 'Arconte', tier: 'free', mmr: '2,800', hasStars: true, isImmortal: false, color: '#ba68c8' },
  { id: '5', name: 'Leyenda', tier: 'free', mmr: '3,600', hasStars: true, isImmortal: false, color: '#ffb74d' },
  { id: '6', name: 'Ancestro', tier: 'free', mmr: '4,500', hasStars: true, isImmortal: false, color: '#4fc3f7' },
  { id: '7', name: 'Divino', tier: 'free', mmr: '5,300', hasStars: true, isImmortal: false, color: '#ffd54f' },
  { id: '8', name: 'Inmortal', tier: 'vip', mmr: '6,500+', hasStars: false, isImmortal: true, color: '#ff7043' },
  { id: '8a', name: 'Top 100', tier: 'vip', mmr: '7,800+', hasStars: false, isImmortal: true, color: '#ffb300' },
  { id: '8b', name: 'Top 10', tier: 'vip', mmr: '9,200+', hasStars: false, isImmortal: true, color: '#ffd700' },
  { id: '8c', name: 'Top 1', tier: 'vip', mmr: '12,000+', hasStars: false, isImmortal: true, color: '#ffffff' },
];

const HERO_TIERS = [
  { id: 0, name: 'Bronce', min: 1, max: 5, gemClass: 'gem-bronze', tier: 'free' },
  { id: 1, name: 'Plata', min: 6, max: 11, gemClass: 'gem-silver', tier: 'free' },
  { id: 2, name: 'Oro', min: 12, max: 17, gemClass: 'gem-gold', tier: 'free' },
  { id: 3, name: 'Platino', min: 18, max: 24, gemClass: 'gem-platinum', tier: 'free' },
  { id: 4, name: 'Maestro', min: 25, max: 29, gemClass: 'gem-master', tier: 'vip' },
  { id: 5, name: 'Gran Maestro', min: 30, max: 30, gemClass: 'gem-grandmaster', tier: 'vip' },
];

function initRankChanger() {
  let currentMedal = RANK_MEDALS.find((m) => m.id === '8a'); // Default Top 100 Inmortal
  let currentStars = 5;
  let currentImmortalRank = 30;
  let currentHeroLevel = 30;

  // Tabs
  const tabBtns = document.querySelectorAll('.rc-tab-btn');
  const tabContents = document.querySelectorAll('.rc-tab-content');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId)?.classList.add('active');
    });
  });

  // Render Medals Grid
  const medalsGrid = document.getElementById('medalsGrid');
  medalsGrid.innerHTML = '';
  RANK_MEDALS.forEach((medal) => {
    const chip = document.createElement('div');
    chip.className = `medal-chip ${medal.id === currentMedal.id ? 'active' : ''}`;
    chip.setAttribute('data-id', medal.id);
    chip.innerHTML = `
      <div class="chip-icon">${generateMiniMedalSvg(medal.id, medal.color)}</div>
      <span class="chip-name">${medal.name}</span>
    `;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.medal-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentMedal = medal;
      updateRankView();
    });
    medalsGrid.appendChild(chip);
  });

  // Stars Buttons
  const starBtns = document.querySelectorAll('.star-btn');
  starBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      starBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentStars = parseInt(btn.getAttribute('data-star'), 10);
      document.getElementById('starsValText').textContent = currentStars;
      updateRankView();
    });
  });

  // Immortal Leaderboard Rank Input
  const immortalInput = document.getElementById('immortalRankInput');
  immortalInput.addEventListener('input', (e) => {
    const clean = e.target.value.replace(/\D/g, '');
    currentImmortalRank = parseInt(clean, 10) || 1;
    updateRankView();
  });

  document.querySelectorAll('.pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentImmortalRank = parseInt(btn.getAttribute('data-rank'), 10);
      immortalInput.value = currentImmortalRank;
      updateRankView();
    });
  });

  // Render Hero Badges Grid
  const badgesGrid = document.getElementById('badgesGrid');
  badgesGrid.innerHTML = '';
  HERO_TIERS.forEach((tier) => {
    const chip = document.createElement('div');
    const isActive = currentHeroLevel >= tier.min && currentHeroLevel <= tier.max;
    chip.className = `badge-chip ${isActive ? 'active' : ''}`;
    chip.setAttribute('data-tier-id', tier.id);
    chip.innerHTML = `
      <div class="chip-tier-gem ${tier.gemClass}">◆</div>
      <span class="chip-name">${tier.name}</span>
    `;
    chip.addEventListener('click', () => {
      currentHeroLevel = tier.max;
      document.getElementById('heroLevelSlider').value = currentHeroLevel;
      updateHeroView();
    });
    badgesGrid.appendChild(chip);
  });

  // Hero Level Slider
  const heroSlider = document.getElementById('heroLevelSlider');
  heroSlider.addEventListener('input', (e) => {
    currentHeroLevel = parseInt(e.target.value, 10);
    updateHeroView();
  });

  function updateRankView() {
    const starsGroup = document.getElementById('starsGroup');
    const immortalGroup = document.getElementById('immortalRankGroup');
    const rankTierNotice = document.getElementById('rankTierNotice');
    const rankAccessTag = document.getElementById('rankAccessTag');
    const rankAccessDesc = document.getElementById('rankAccessDesc');

    if (currentMedal.isImmortal) {
      starsGroup.style.display = 'none';
      immortalGroup.style.display = 'flex';
      rankAccessTag.className = 'access-tag vip-tag';
      rankAccessTag.textContent = 'VIP EXCLUSIVO';
      rankAccessDesc.textContent = 'Las medallas Inmortal y Top requieren suscripción VIP';
    } else {
      immortalGroup.style.display = 'none';
      starsGroup.style.display = currentMedal.hasStars ? 'flex' : 'none';
      rankAccessTag.className = 'access-tag free-tag';
      rankAccessTag.textContent = 'PLAN FREE';
      rankAccessDesc.textContent = 'Disponible gratis para todos los usuarios';
    }

    // Update Profile Card
    const previewMmr = document.getElementById('previewMmr');
    const previewRankName = document.getElementById('previewRankName');
    const previewStarsContainer = document.getElementById('previewStarsContainer');
    const immortalPlaqueWrap = document.getElementById('immortalPlaqueWrap');
    const previewPlaqueDigit = document.getElementById('previewPlaqueDigit');
    const medalGraphic = document.getElementById('medalGraphic');

    // MMR calculation
    let mmrText = currentMedal.mmr;
    if (currentMedal.hasStars) {
      const baseMmr = parseInt(currentMedal.mmr.replace(/\D/g, ''), 10);
      const computedMmr = baseMmr + (currentStars - 1) * 150;
      mmrText = `${computedMmr.toLocaleString()} MMR`;
    } else if (currentMedal.isImmortal) {
      if (currentImmortalRank <= 10) mmrText = `${(10000 + (10 - currentImmortalRank) * 200).toLocaleString()} MMR`;
      else if (currentImmortalRank <= 100) mmrText = `${(8500 + (100 - currentImmortalRank) * 15).toLocaleString()} MMR`;
      else mmrText = '6,800+ MMR';
    }
    previewMmr.textContent = mmrText;

    // Rank label
    let titleText = currentMedal.name;
    if (currentMedal.hasStars) {
      titleText += ` ${currentStars} ★`;
    } else if (currentMedal.isImmortal) {
      titleText += ` (Top ${currentImmortalRank})`;
    }
    previewRankName.textContent = titleText;

    // Stars
    previewStarsContainer.innerHTML = '';
    if (currentMedal.hasStars) {
      for (let i = 0; i < currentStars; i++) {
        const star = document.createElement('div');
        star.innerHTML = `
          <svg class="star-icon" viewBox="0 0 24 24" fill="#ffd700">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        `;
        previewStarsContainer.appendChild(star);
      }
    }

    // Immortal Plaque
    if (currentMedal.isImmortal) {
      immortalPlaqueWrap.style.display = 'block';
      // Strip any '#' and center digits cleanly
      previewPlaqueDigit.textContent = String(currentImmortalRank).replace(/^#/, '').trim();
    } else {
      immortalPlaqueWrap.style.display = 'none';
    }

    // Draw Main Medal SVG
    medalGraphic.innerHTML = generateFullMedalSvg(currentMedal.id, currentMedal.color);
  }

  function updateHeroView() {
    document.getElementById('heroLevelDisplay').textContent = currentHeroLevel;

    // Find current tier
    const activeTier = HERO_TIERS.find((t) => currentHeroLevel >= t.min && currentHeroLevel <= t.max) || HERO_TIERS[5];

    // Update chips
    document.querySelectorAll('.badge-chip').forEach((chip) => {
      const tierId = parseInt(chip.getAttribute('data-tier-id'), 10);
      chip.classList.toggle('active', tierId === activeTier.id);
    });

    // Update access notice
    const heroAccessTag = document.getElementById('heroAccessTag');
    const heroAccessDesc = document.getElementById('heroAccessDesc');
    if (activeTier.tier === 'vip') {
      heroAccessTag.className = 'access-tag vip-tag';
      heroAccessTag.textContent = 'VIP EXCLUSIVO';
      heroAccessDesc.textContent = 'Nivel Maestro (25-29) y Gran Maestro (30) requieren suscripción VIP';
    } else {
      heroAccessTag.className = 'access-tag free-tag';
      heroAccessTag.textContent = 'PLAN FREE';
      heroAccessDesc.textContent = `Insignia ${activeTier.name} (Nivel ${activeTier.min}-${activeTier.max}) incluida gratis`;
    }

    // Update Preview Badge
    const previewHeroBadgeNum = document.getElementById('previewHeroBadgeNum');
    const previewBadgeEmblem = document.getElementById('previewBadgeEmblem');
    const previewHeroTierTitle = document.getElementById('previewHeroTierTitle');

    previewHeroBadgeNum.textContent = currentHeroLevel;
    previewHeroTierTitle.textContent = `${activeTier.name} (Nivel ${currentHeroLevel})`;

    // Styling according to tier
    const gemStyles = {
      0: { border: '#cd7f32', shadow: 'rgba(205, 127, 50, 0.5)' },
      1: { border: '#c0c0c0', shadow: 'rgba(192, 192, 192, 0.5)' },
      2: { border: '#ffd700', shadow: 'rgba(255, 215, 0, 0.5)' },
      3: { border: '#00e5ff', shadow: 'rgba(0, 229, 255, 0.5)' },
      4: { border: '#9d4edd', shadow: 'rgba(157, 78, 221, 0.8)' },
      5: { border: '#ff3d00', shadow: 'rgba(255, 61, 0, 0.9)' },
    };

    const style = gemStyles[activeTier.id] || gemStyles[5];
    previewBadgeEmblem.style.borderColor = style.border;
    previewBadgeEmblem.style.boxShadow = `0 0 15px ${style.shadow}`;
  }

  // Initial runs
  updateRankView();
  updateHeroView();
}

/* ==========================================================================
   SVG VECTOR MEDALS GENERATOR
   ========================================================================== */
function generateMiniMedalSvg(id, color) {
  return `
    <svg viewBox="0 0 40 40" width="32" height="32">
      <defs>
        <radialGradient id="grad-${id}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#111" stop-opacity="0.9"/>
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="16" fill="url(#grad-${id})" stroke="${color}" stroke-width="1.5"/>
      <polygon points="20,8 23,16 32,16 25,21 28,30 20,24 12,30 15,21 8,16 17,16" fill="${color}"/>
    </svg>
  `;
}

function generateFullMedalSvg(id, color) {
  const isImmortal = id.startsWith('8');
  const frameColor = isImmortal ? '#ffd700' : color;

  return `
    <svg viewBox="0 0 200 200" width="180" height="180">
      <defs>
        <!-- Gradients -->
        <linearGradient id="mainGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${frameColor}" stop-opacity="0.8"/>
          <stop offset="50%" stop-color="#ff9800" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#e63946" stop-opacity="0.8"/>
        </linearGradient>
        <linearGradient id="wingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${frameColor}"/>
          <stop offset="100%" stop-color="#2a2210"/>
        </linearGradient>
        <filter id="medalShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.9"/>
        </filter>
      </defs>

      <!-- Wings Backing -->
      <g filter="url(#medalShadow)">
        <path d="M 30,110 C 10,70 35,30 65,55 C 50,75 55,95 65,115 Z" fill="url(#wingGrad)" opacity="0.9"/>
        <path d="M 170,110 C 190,70 165,30 135,55 C 150,75 145,95 135,115 Z" fill="url(#wingGrad)" opacity="0.9"/>
      </g>

      <!-- Outer Shield Frame -->
      <polygon points="100,20 160,50 160,125 100,175 40,125 40,50" 
               fill="#131824" stroke="url(#mainGlow)" stroke-width="4" filter="url(#medalShadow)"/>

      <!-- Inner Crest -->
      <polygon points="100,32 148,56 148,118 100,158 52,118 52,56" 
               fill="linear-gradient(180deg, #242c3d 0%, #0d111a 100%)" stroke="${frameColor}" stroke-width="1.5"/>

      <!-- Central Icon / Star -->
      <g transform="translate(100, 95)">
        <circle cx="0" cy="0" r="28" fill="#080b12" stroke="${frameColor}" stroke-width="2"/>
        <path d="M 0,-20 L 5,-6 L 19,-5 L 8,5 L 12,19 L 0,10 L -12,19 L -8,5 L -19,-5 L -5,-6 Z" 
              fill="${frameColor}" filter="drop-shadow(0 0 8px ${frameColor})"/>
      </g>
    </svg>
  `;
}
