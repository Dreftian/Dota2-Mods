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
   INTERACTIVE RANK & HERO BADGE CHANGER (AUTHENTIC DOTA 2 ASSETS)
   ========================================================================== */
const RANK_MEDALS = [
  { id: 'rank0', name: 'Sin Calibrar', nameEn: 'Uncalibrated', tier: 'free', badge: 'FREE', defaultMmr: 0, hasStars: false, isImmortal: false },
  { id: 'rank1', name: 'Heraldo', nameEn: 'Herald', tier: 'free', badge: 'FREE', defaultMmr: 150, hasStars: true, isImmortal: false },
  { id: 'rank2', name: 'Guardián', nameEn: 'Guardian', tier: 'free', badge: 'FREE', defaultMmr: 850, hasStars: true, isImmortal: false },
  { id: 'rank3', name: 'Cruzado', nameEn: 'Crusader', tier: 'free', badge: 'FREE', defaultMmr: 1650, hasStars: true, isImmortal: false },
  { id: 'rank4', name: 'Arconte', nameEn: 'Archon', tier: 'free', badge: 'FREE', defaultMmr: 2450, hasStars: true, isImmortal: false },
  { id: 'rank5', name: 'Leyenda', nameEn: 'Legend', tier: 'free', badge: 'FREE', defaultMmr: 3250, hasStars: true, isImmortal: false },
  { id: 'rank6', name: 'Ancestral', nameEn: 'Ancient', tier: 'free', badge: 'FREE', defaultMmr: 4050, hasStars: true, isImmortal: false },
  { id: 'rank7', name: 'Divino', nameEn: 'Divine', tier: 'free', badge: 'FREE', defaultMmr: 4850, hasStars: true, isImmortal: false },
  { id: 'rank8', name: 'Inmortal', nameEn: 'Immortal', tier: 'vip', badge: 'VIP', defaultMmr: 5620, hasStars: false, isImmortal: true },
  { id: 'rank8a', name: 'Top 1000', nameEn: 'Immortal Top 1000', tier: 'vip', badge: 'VIP', defaultMmr: 8620, hasStars: false, isImmortal: true },
  { id: 'rank8b', name: 'Top 100', nameEn: 'Immortal Top 100', tier: 'vip', badge: 'VIP', defaultMmr: 10620, hasStars: false, isImmortal: true },
  { id: 'rank8c', name: 'Top 10', nameEn: 'Immortal Top 10', tier: 'vip', badge: 'VIP', defaultMmr: 12620, hasStars: false, isImmortal: true },
];

const HERO_TIERS = [
  { id: 0, name: 'Bronce', levels: '1-5', min: 1, max: 5, badge: 'FREE', tier: 'free' },
  { id: 1, name: 'Plata', levels: '6-11', min: 6, max: 11, badge: 'FREE', tier: 'free' },
  { id: 2, name: 'Oro', levels: '12-17', min: 12, max: 17, badge: 'FREE', tier: 'free' },
  { id: 3, name: 'Platino', levels: '18-24', min: 18, max: 24, badge: 'FREE', tier: 'free' },
  { id: 4, name: 'Maestro', levels: '25-29', min: 25, max: 29, badge: 'VIP', tier: 'vip' },
  { id: 5, name: 'Gran Maestro', levels: '30', min: 30, max: 30, badge: 'VIP', tier: 'vip' },
];

function initRankChanger() {
  let currentMedal = RANK_MEDALS.find((m) => m.id === '8b') || RANK_MEDALS[10]; // Top 100 default
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

  // Render Medals Grid with authentic Dota 2 PNGs
  const medalsGrid = document.getElementById('medalsGrid');
  if (medalsGrid) {
    medalsGrid.innerHTML = '';
    RANK_MEDALS.forEach((medal) => {
      const chip = document.createElement('div');
      chip.className = `medal-chip ${medal.id === currentMedal.id ? 'active' : ''}`;
      chip.setAttribute('data-id', medal.id);
      chip.innerHTML = `
        <img src="assets/ranks/${medal.id}.png" alt="${medal.name}" class="chip-medal-img" draggable="false" />
        <span class="chip-name">${medal.name}</span>
        <span class="chip-tier-tag ${medal.tier}">${medal.badge}</span>
      `;
      chip.addEventListener('click', () => {
        document.querySelectorAll('.medal-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        currentMedal = medal;
        updateRankView();
      });
      medalsGrid.appendChild(chip);
    });
  }

  // Stars Buttons
  const starBtns = document.querySelectorAll('.star-btn');
  starBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      starBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentStars = parseInt(btn.getAttribute('data-star'), 10);
      const valText = document.getElementById('starsValText');
      if (valText) valText.textContent = currentStars;
      updateRankView();
    });
  });

  // Immortal Leaderboard Rank Input
  const immortalInput = document.getElementById('immortalRankInput');
  if (immortalInput) {
    immortalInput.addEventListener('input', (e) => {
      const clean = e.target.value.replace(/\D/g, '');
      currentImmortalRank = parseInt(clean, 10) || 1;
      updateRankView();
    });
  }

  document.querySelectorAll('.pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentImmortalRank = parseInt(btn.getAttribute('data-rank'), 10);
      if (immortalInput) immortalInput.value = currentImmortalRank;
      updateRankView();
    });
  });

  // Render Hero Badges Grid with authentic Dota 2 PNGs
  const badgesGrid = document.getElementById('badgesGrid');
  if (badgesGrid) {
    badgesGrid.innerHTML = '';
    HERO_TIERS.forEach((tier) => {
      const chip = document.createElement('div');
      const isActive = currentHeroLevel >= tier.min && currentHeroLevel <= tier.max;
      chip.className = `badge-chip ${isActive ? 'active' : ''}`;
      chip.setAttribute('data-tier-id', tier.id);
      chip.innerHTML = `
        <img src="assets/herotier/tier${tier.id}.png" alt="${tier.name}" class="chip-tier-img" draggable="false" />
        <span class="chip-name">${tier.name}</span>
        <span class="chip-sub">Nivel ${tier.levels}</span>
        <span class="chip-tier-tag ${tier.tier}">${tier.badge}</span>
      `;
      chip.addEventListener('click', () => {
        currentHeroLevel = tier.max;
        const slider = document.getElementById('heroLevelSlider');
        if (slider) slider.value = currentHeroLevel;
        updateHeroView();
      });
      badgesGrid.appendChild(chip);
    });
  }

  // Hero Level Slider
  const heroSlider = document.getElementById('heroLevelSlider');
  if (heroSlider) {
    heroSlider.addEventListener('input', (e) => {
      currentHeroLevel = parseInt(e.target.value, 10);
      updateHeroView();
    });
  }

  function updateRankView() {
    const starsGroup = document.getElementById('starsGroup');
    const immortalGroup = document.getElementById('immortalRankGroup');
    const rankAccessTag = document.getElementById('rankAccessTag');
    const rankAccessDesc = document.getElementById('rankAccessDesc');

    if (currentMedal.isImmortal) {
      if (starsGroup) starsGroup.style.display = 'none';
      if (immortalGroup) immortalGroup.style.display = 'flex';
      if (rankAccessTag) {
        rankAccessTag.className = 'access-tag vip-tag';
        rankAccessTag.textContent = 'VIP EXCLUSIVO';
      }
      if (rankAccessDesc) {
        rankAccessDesc.textContent = 'Las medallas Inmortal y Top requieren suscripción VIP';
      }
    } else {
      if (immortalGroup) immortalGroup.style.display = 'none';
      if (starsGroup) starsGroup.style.display = currentMedal.hasStars ? 'flex' : 'none';
      if (rankAccessTag) {
        rankAccessTag.className = 'access-tag free-tag';
        rankAccessTag.textContent = 'PLAN FREE';
      }
      if (rankAccessDesc) {
        rankAccessDesc.textContent = 'Disponible gratis para todos los usuarios de Mod Assistant';
      }
    }

    // Update Profile Card
    const previewMmr = document.getElementById('previewMmr');
    const previewRankName = document.getElementById('previewRankName');
    const previewMedalImg = document.getElementById('previewMedalImg');
    const previewStarsImg = document.getElementById('previewStarsImg');
    const immortalPlaqueWrap = document.getElementById('immortalPlaqueWrap');
    const previewPlaqueDigit = document.getElementById('previewPlaqueDigit');

    // MMR calculation
    let mmrVal = currentMedal.defaultMmr;
    if (currentMedal.hasStars) {
      mmrVal = currentMedal.defaultMmr + (currentStars - 1) * 140;
    } else if (currentMedal.isImmortal) {
      if (currentImmortalRank <= 10) mmrVal = 12000 + (10 - currentImmortalRank) * 250;
      else if (currentImmortalRank <= 100) mmrVal = 10000 + (100 - currentImmortalRank) * 20;
      else if (currentImmortalRank <= 1000) mmrVal = 8000 + (1000 - currentImmortalRank) * 2;
      else mmrVal = 6200;
    }
    if (previewMmr) {
      previewMmr.textContent = mmrVal > 0 ? `${mmrVal.toLocaleString()} MMR` : '— MMR';
    }

    // Rank label
    let titleText = currentMedal.name;
    if (currentMedal.hasStars) {
      titleText += ` ${currentStars} ★`;
    } else if (currentMedal.isImmortal) {
      titleText += ` (Top ${currentImmortalRank})`;
    }
    if (previewRankName) previewRankName.textContent = titleText;

    // Authentic Medal Image
    if (previewMedalImg) {
      previewMedalImg.src = `assets/ranks/${currentMedal.id}.png`;
      previewMedalImg.alt = currentMedal.name;
    }

    // Authentic Stars Overlay
    if (previewStarsImg) {
      if (currentMedal.hasStars) {
        previewStarsImg.src = `assets/ranks/stars${currentStars}.png`;
        previewStarsImg.style.display = 'block';
      } else {
        previewStarsImg.style.display = 'none';
      }
    }

    // Immortal Plaque Frame & Centered Digit (strictly without #)
    if (immortalPlaqueWrap && previewPlaqueDigit) {
      if (currentMedal.isImmortal) {
        immortalPlaqueWrap.style.display = 'block';
        previewPlaqueDigit.textContent = String(currentImmortalRank).replace(/^#/, '').trim();
      } else {
        immortalPlaqueWrap.style.display = 'none';
      }
    }
  }

  function updateHeroView() {
    const levelDisp = document.getElementById('heroLevelDisplay');
    if (levelDisp) levelDisp.textContent = currentHeroLevel;

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
      if (heroAccessTag) {
        heroAccessTag.className = 'access-tag vip-tag';
        heroAccessTag.textContent = 'VIP EXCLUSIVO';
      }
      if (heroAccessDesc) {
        heroAccessDesc.textContent = 'Nivel Maestro (25-29) y Gran Maestro (30) requieren suscripción VIP';
      }
    } else {
      if (heroAccessTag) {
        heroAccessTag.className = 'access-tag free-tag';
        heroAccessTag.textContent = 'PLAN FREE';
      }
      if (heroAccessDesc) {
        heroAccessDesc.textContent = `Insignia ${activeTier.name} (Nivel ${activeTier.min}-${activeTier.max}) incluida gratis`;
      }
    }

    // Update Preview Hero Badge with Authentic Dota 2 PNG
    const previewHeroTierImg = document.getElementById('previewHeroTierImg');
    const previewHeroBadgeNum = document.getElementById('previewHeroBadgeNum');
    const previewHeroTierTitle = document.getElementById('previewHeroTierTitle');

    if (previewHeroTierImg) {
      previewHeroTierImg.src = `assets/herotier/tier${activeTier.id}.png`;
      previewHeroTierImg.alt = activeTier.name;
    }
    if (previewHeroBadgeNum) {
      previewHeroBadgeNum.textContent = currentHeroLevel;
    }
    if (previewHeroTierTitle) {
      previewHeroTierTitle.textContent = `${activeTier.name} (Nivel ${currentHeroLevel})`;
    }
  }

  // Initial update
  updateRankView();
  updateHeroView();
}
