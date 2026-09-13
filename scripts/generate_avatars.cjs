const fs = require('fs');
const path = require('path');

const avatarsDir = path.join(__dirname, '../public/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// 16 Rich Anime Avatars as vector SVGs
const avatars = [
  {
    id: 'avatar-01',
    name: 'Shadow Ninja',
    bgGradient: ['#1e1b4b', '#0f172a', '#e11d48'],
    hairColor: '#0f172a',
    hairHighlight: '#334155',
    skinColor: '#fde047',
    skinTone: '#fed7aa',
    eyeColor: '#ef4444',
    clothColor: '#09090b',
    accentColor: '#e11d48',
    detail: 'ninja',
  },
  {
    id: 'avatar-02',
    name: 'Sakura Mage',
    bgGradient: ['#4a044e', '#1e1b4b', '#ec4899'],
    hairColor: '#f472b6',
    hairHighlight: '#fbcfe8',
    skinColor: '#ffedd5',
    skinTone: '#fecdd3',
    eyeColor: '#ec4899',
    clothColor: '#831843',
    accentColor: '#fb7185',
    detail: 'mage_girl',
  },
  {
    id: 'avatar-03',
    name: 'Cyberpunk Netrunner',
    bgGradient: ['#042f2e', '#0f172a', '#06b6d4'],
    hairColor: '#06b6d4',
    hairHighlight: '#67e8f9',
    skinColor: '#fef3c7',
    skinTone: '#fed7aa',
    eyeColor: '#06b6d4',
    clothColor: '#111827',
    accentColor: '#22d3ee',
    detail: 'cyber_visor',
  },
  {
    id: 'avatar-04',
    name: 'Flame Brawler',
    bgGradient: ['#450a0a', '#18181b', '#f97316'],
    hairColor: '#ea580c',
    hairHighlight: '#fdba74',
    skinColor: '#ffedd5',
    skinTone: '#fed7aa',
    eyeColor: '#f97316',
    clothColor: '#1c1917',
    accentColor: '#f59e0b',
    detail: 'flame_spikes',
  },
  {
    id: 'avatar-05',
    name: 'Cosmic Sorceress',
    bgGradient: ['#2e1065', '#0f172a', '#8b5cf6'],
    hairColor: '#7c3aed',
    hairHighlight: '#c4b5fd',
    skinColor: '#fdf2f8',
    skinTone: '#fbcfe8',
    eyeColor: '#a855f7',
    clothColor: '#3b0764',
    accentColor: '#c084fc',
    detail: 'cosmic_mark',
  },
  {
    id: 'avatar-06',
    name: 'Ronin Blade',
    bgGradient: ['#082f49', '#09090b', '#38bdf8'],
    hairColor: '#1e293b',
    hairHighlight: '#475569',
    skinColor: '#fef3c7',
    skinTone: '#fed7aa',
    eyeColor: '#38bdf8',
    clothColor: '#0369a1',
    accentColor: '#7dd3fc',
    detail: 'samurai_knot',
  },
  {
    id: 'avatar-07',
    name: 'Golden Paladin',
    bgGradient: ['#451a03', '#0f172a', '#eab308'],
    hairColor: '#eab308',
    hairHighlight: '#fef08a',
    skinColor: '#fffbeb',
    skinTone: '#fde68a',
    eyeColor: '#3b82f6',
    clothColor: '#78350f',
    accentColor: '#fbbf24',
    detail: 'knight_collar',
  },
  {
    id: 'avatar-08',
    name: 'Mecha Pilot',
    bgGradient: ['#022c22', '#0f172a', '#10b981'],
    hairColor: '#e2e8f0',
    hairHighlight: '#ffffff',
    skinColor: '#f8fafc',
    skinTone: '#e2e8f0',
    eyeColor: '#10b981',
    clothColor: '#064e3b',
    accentColor: '#34d399',
    detail: 'pilot_suit',
  },
  {
    id: 'avatar-09',
    name: 'Forest Ranger',
    bgGradient: ['#064e3b', '#09090b', '#22c55e'],
    hairColor: '#15803d',
    hairHighlight: '#86efac',
    skinColor: '#fef3c7',
    skinTone: '#fed7aa',
    eyeColor: '#22c55e',
    clothColor: '#14532d',
    accentColor: '#4ade80',
    detail: 'elf_ears',
  },
  {
    id: 'avatar-10',
    name: 'Spirit Kitsune',
    bgGradient: ['#4c0519', '#18181b', '#f43f5e'],
    hairColor: '#f8fafc',
    hairHighlight: '#ffffff',
    skinColor: '#fff1f2',
    skinTone: '#fecdd3',
    eyeColor: '#e11d48',
    clothColor: '#881337',
    accentColor: '#fb7185',
    detail: 'fox_ears',
  },
  {
    id: 'avatar-11',
    name: 'Phantom Reaper',
    bgGradient: ['#18181b', '#09090b', '#6366f1'],
    hairColor: '#27272a',
    hairHighlight: '#52525b',
    skinColor: '#e4e4e7',
    skinTone: '#d4d4d8',
    eyeColor: '#818cf8',
    clothColor: '#09090b',
    accentColor: '#6366f1',
    detail: 'hood_cloak',
  },
  {
    id: 'avatar-12',
    name: 'Astral Alchemist',
    bgGradient: ['#134e4a', '#0f172a', '#14b8a6'],
    hairColor: '#0d9488',
    hairHighlight: '#5eead4',
    skinColor: '#fef3c7',
    skinTone: '#fed7aa',
    eyeColor: '#f59e0b',
    clothColor: '#115e59',
    accentColor: '#2dd4bf',
    detail: 'goggles',
  },
  {
    id: 'avatar-13',
    name: 'Dragon Slayer',
    bgGradient: ['#7c2d12', '#1c1917', '#ef4444'],
    hairColor: '#c2410c',
    hairHighlight: '#fb923c',
    skinColor: '#ffedd5',
    skinTone: '#fed7aa',
    eyeColor: '#f97316',
    clothColor: '#431407',
    accentColor: '#ea580c',
    detail: 'dragon_mark',
  },
  {
    id: 'avatar-14',
    name: 'Starlight Idol',
    bgGradient: ['#3b0764', '#18181b', '#d946ef'],
    hairColor: '#c084fc',
    hairHighlight: '#f3e8ff',
    skinColor: '#fdf2f8',
    skinTone: '#fbcfe8',
    eyeColor: '#d946ef',
    clothColor: '#581c87',
    accentColor: '#e879f9',
    detail: 'idol_twintails',
  },
  {
    id: 'avatar-15',
    name: 'Shadow Assassin',
    bgGradient: ['#0f172a', '#020617', '#dc2626'],
    hairColor: '#0f172a',
    hairHighlight: '#1e293b',
    skinColor: '#f1f5f9',
    skinTone: '#cbd5e1',
    eyeColor: '#ef4444',
    clothColor: '#020617',
    accentColor: '#dc2626',
    detail: 'face_mask',
  },
  {
    id: 'avatar-16',
    name: 'Celestial Sage',
    bgGradient: ['#1e1b4b', '#030712', '#a855f7'],
    hairColor: '#f1f5f9',
    hairHighlight: '#ffffff',
    skinColor: '#f8fafc',
    skinTone: '#e2e8f0',
    eyeColor: '#38bdf8',
    clothColor: '#312e81',
    accentColor: '#818cf8',
    detail: 'celestial_halo',
  },
];

function generateSvg(av) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <!-- Background Radial Aura -->
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="${av.bgGradient[2]}" stop-opacity="0.85"/>
      <stop offset="55%" stop-color="${av.bgGradient[0]}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${av.bgGradient[1]}" stop-opacity="1"/>
    </radialGradient>

    <!-- Hair Shading Gradient -->
    <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${av.hairHighlight}"/>
      <stop offset="35%" stop-color="${av.hairColor}"/>
      <stop offset="100%" stop-color="#050508"/>
    </linearGradient>

    <!-- Skin Shading Gradient -->
    <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${av.skinColor}"/>
      <stop offset="100%" stop-color="${av.skinTone}"/>
    </linearGradient>

    <!-- Clothing Gradient -->
    <linearGradient id="clothGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${av.accentColor}"/>
      <stop offset="40%" stop-color="${av.clothColor}"/>
      <stop offset="100%" stop-color="#09090b"/>
    </linearGradient>

    <!-- Eye Iris Gradient -->
    <radialGradient id="eyeGrad" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="30%" stop-color="${av.accentColor}"/>
      <stop offset="85%" stop-color="${av.eyeColor}"/>
      <stop offset="100%" stop-color="#050508"/>
    </radialGradient>

    <!-- Glow Filter -->
    <filter id="auraGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Circular Base Mask -->
  <clipPath id="circleClip">
    <circle cx="100" cy="100" r="96"/>
  </clipPath>

  <g clip-path="url(#circleClip)">
    <!-- 1. Background -->
    <rect width="200" height="200" fill="url(#bgGrad)"/>

    <!-- Subtle Aura Ring -->
    <circle cx="100" cy="90" r="75" fill="none" stroke="${av.accentColor}" stroke-width="1.5" stroke-opacity="0.3" stroke-dasharray="6 4"/>
    <circle cx="100" cy="90" r="82" fill="none" stroke="${av.bgGradient[2]}" stroke-width="0.75" stroke-opacity="0.2"/>

    <!-- Specific Back Accessories (Wings / Fox Ears / Halo) -->
    ${av.detail === 'fox_ears' ? `
      <!-- Fox Ears -->
      <polygon points="50,65 30,10 75,40" fill="${av.hairColor}" stroke="${av.hairHighlight}" stroke-width="1.5"/>
      <polygon points="52,58 38,22 68,42" fill="#f43f5e" opacity="0.8"/>
      <polygon points="150,65 170,10 125,40" fill="${av.hairColor}" stroke="${av.hairHighlight}" stroke-width="1.5"/>
      <polygon points="148,58 162,22 132,42" fill="#f43f5e" opacity="0.8"/>
    ` : ''}

    ${av.detail === 'celestial_halo' ? `
      <!-- Celestial Halo -->
      <ellipse cx="100" cy="36" rx="55" ry="14" fill="none" stroke="${av.accentColor}" stroke-width="3" filter="url(#auraGlow)"/>
      <ellipse cx="100" cy="36" rx="55" ry="14" fill="none" stroke="#ffffff" stroke-width="1.2"/>
    ` : ''}

    ${av.detail === 'cosmic_mark' ? `
      <!-- Cosmic Crescent -->
      <path d="M 90,20 A 18,18 0 0,0 110,38 A 14,14 0 0,1 94,22 Z" fill="${av.accentColor}" filter="url(#auraGlow)"/>
    ` : ''}

    <!-- 2. Back Hair -->
    <path d="M 50,75 C 30,100 25,140 40,165 C 55,145 60,115 65,85 Z" fill="${av.hairColor}" opacity="0.9"/>
    <path d="M 150,75 C 170,100 175,140 160,165 C 145,145 140,115 135,85 Z" fill="${av.hairColor}" opacity="0.9"/>
    ${av.detail === 'idol_twintails' ? `
      <!-- Long Twintails -->
      <path d="M 45,70 C 15,95 5,140 18,180 C 28,145 35,110 52,80 Z" fill="url(#hairGrad)"/>
      <path d="M 155,70 C 185,95 195,140 182,180 C 172,145 165,110 148,80 Z" fill="url(#hairGrad)"/>
      <circle cx="48" cy="72" r="5" fill="${av.accentColor}"/>
      <circle cx="152" cy="72" r="5" fill="${av.accentColor}"/>
    ` : ''}

    <!-- 3. Shoulders & Body Clothing -->
    <path d="M 30,200 C 30,160 55,145 100,145 C 145,145 170,160 170,200 Z" fill="url(#clothGrad)"/>
    
    <!-- Collar & Chest Armor/Robe -->
    <path d="M 75,145 L 100,180 L 125,145 Z" fill="#18181b"/>
    <path d="M 82,145 L 100,172 L 118,145 Z" fill="${av.accentColor}" opacity="0.3"/>
    <line x1="100" y1="145" x2="100" y2="200" stroke="${av.accentColor}" stroke-width="2" stroke-dasharray="4 2"/>

    <!-- Neck -->
    <path d="M 86,115 L 86,145 C 92,150 108,150 114,145 L 114,115 Z" fill="${av.skinTone}"/>

    <!-- 4. Face & Head -->
    <!-- Head / Chin Base -->
    <path d="M 60,82 C 60,122 80,140 100,140 C 120,140 140,122 140,82 C 140,55 122,46 100,46 C 78,46 60,55 60,82 Z" fill="url(#skinGrad)"/>

    <!-- Elf Ears / Normal Ears -->
    ${av.detail === 'elf_ears' ? `
      <!-- Elven Pointed Ears -->
      <polygon points="58,82 30,68 62,95" fill="${av.skinColor}" stroke="${av.skinTone}" stroke-width="1"/>
      <polygon points="142,82 170,68 138,95" fill="${av.skinColor}" stroke="${av.skinTone}" stroke-width="1"/>
    ` : `
      <!-- Standard Anime Ears -->
      <path d="M 58,80 C 52,80 50,92 60,95 Z" fill="${av.skinTone}"/>
      <path d="M 142,80 C 148,80 150,92 140,95 Z" fill="${av.skinTone}"/>
    `}

    <!-- 5. Eyes & Expression -->
    <!-- Eyebrows -->
    <path d="M 68,76 Q 80,72 88,76" stroke="${av.hairColor}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M 132,76 Q 120,72 112,76" stroke="${av.hairColor}" stroke-width="2.5" stroke-linecap="round" fill="none"/>

    <!-- Left Eye -->
    <ellipse cx="78" cy="88" rx="9" ry="11" fill="#09090b"/>
    <ellipse cx="78" cy="88" rx="8" ry="10" fill="url(#eyeGrad)"/>
    <ellipse cx="78" cy="88" rx="4" ry="5" fill="#050508"/>
    <!-- Eye Highlights -->
    <circle cx="76" cy="84" r="3" fill="#ffffff"/>
    <circle cx="81" cy="91" r="1.5" fill="#ffffff" opacity="0.8"/>

    <!-- Right Eye -->
    <ellipse cx="122" cy="88" rx="9" ry="11" fill="#09090b"/>
    <ellipse cx="122" cy="88" rx="8" ry="10" fill="url(#eyeGrad)"/>
    <ellipse cx="122" cy="88" rx="4" ry="5" fill="#050508"/>
    <!-- Eye Highlights -->
    <circle cx="120" cy="84" r="3" fill="#ffffff"/>
    <circle cx="125" cy="91" r="1.5" fill="#ffffff" opacity="0.8"/>

    <!-- Eyelash Line -->
    <path d="M 67,82 Q 78,79 89,83" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M 133,82 Q 122,79 111,83" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>

    <!-- Nose -->
    <path d="M 99,96 L 97,102 L 101,102" stroke="${av.skinTone}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

    <!-- Mouth -->
    <path d="M 94,115 Q 100,118 106,115" stroke="#991b1b" stroke-width="2" stroke-linecap="round" fill="none"/>

    <!-- Cheek Blush -->
    <ellipse cx="68" cy="99" rx="6" ry="3" fill="${av.accentColor}" opacity="0.25"/>
    <ellipse cx="132" cy="99" rx="6" ry="3" fill="${av.accentColor}" opacity="0.25"/>

    <!-- 6. Forehead & Head Accessories (Ninja Band, Cyber Visor, Goggles, Face Mask) -->
    ${av.detail === 'ninja' ? `
      <!-- Ninja Forehead Protector -->
      <path d="M 60,62 Q 100,58 140,62 L 142,72 Q 100,68 58,72 Z" fill="#09090b"/>
      <rect x="82" y="63" width="36" height="8" rx="2" fill="#cbd5e1" stroke="#475569" stroke-width="1"/>
      <circle cx="85" cy="67" r="1" fill="#475569"/>
      <circle cx="115" cy="67" r="1" fill="#475569"/>
      <path d="M 95,67 L 100,65 L 105,67" stroke="#e11d48" stroke-width="1.5" fill="none"/>
    ` : ''}

    ${av.detail === 'cyber_visor' ? `
      <!-- Holographic Visor -->
      <path d="M 62,80 Q 100,75 138,80 L 135,94 Q 100,90 65,94 Z" fill="${av.accentColor}" opacity="0.65" filter="url(#auraGlow)"/>
      <path d="M 62,80 Q 100,75 138,80" stroke="#ffffff" stroke-width="1.5" fill="none"/>
      <!-- Cyber Headset -->
      <rect x="52" y="80" width="8" height="16" rx="3" fill="#0f172a" stroke="${av.accentColor}" stroke-width="1.5"/>
      <rect x="140" y="80" width="8" height="16" rx="3" fill="#0f172a" stroke="${av.accentColor}" stroke-width="1.5"/>
    ` : ''}

    ${av.detail === 'face_mask' ? `
      <!-- Assassin Stealth Face Mask -->
      <path d="M 68,98 Q 100,104 132,98 L 126,135 Q 100,142 74,135 Z" fill="#09090b" stroke="${av.accentColor}" stroke-width="1"/>
      <line x1="88" y1="115" x2="112" y2="115" stroke="${av.accentColor}" stroke-width="1.5" opacity="0.6"/>
    ` : ''}

    ${av.detail === 'goggles' ? `
      <!-- Alchemist Goggles on Forehead -->
      <rect x="68" y="52" width="28" height="18" rx="8" fill="#78350f" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="82" cy="61" r="7" fill="#0d9488" stroke="#fef08a" stroke-width="1.5"/>
      <rect x="104" y="52" width="28" height="18" rx="8" fill="#78350f" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="118" cy="61" r="7" fill="#0d9488" stroke="#fef08a" stroke-width="1.5"/>
      <line x1="96" y1="61" x2="104" y2="61" stroke="#fbbf24" stroke-width="2.5"/>
    ` : ''}

    ${av.detail === 'dragon_mark' ? `
      <!-- Dragon Scale Face Tattoo -->
      <path d="M 126,92 L 132,98 L 128,104 L 134,110" stroke="${av.accentColor}" stroke-width="2" stroke-linecap="round" fill="none"/>
    ` : ''}

    <!-- 7. Front Hair Strands & Bangs -->
    <path d="M 52,70 C 50,45 70,30 100,30 C 130,30 150,45 148,70 C 138,55 125,50 110,50 C 95,50 80,55 70,72 C 65,60 58,62 52,70 Z" fill="url(#hairGrad)"/>
    <!-- Dynamic Hair Bangs -->
    <polygon points="65,58 74,86 82,62" fill="url(#hairGrad)"/>
    <polygon points="80,56 94,92 102,60" fill="url(#hairGrad)"/>
    <polygon points="98,58 108,88 118,60" fill="url(#hairGrad)"/>
    <polygon points="114,60 126,82 134,58" fill="url(#hairGrad)"/>
    
    <!-- Top Hair Fluff/Spikes -->
    <polygon points="90,32 100,18 108,32" fill="url(#hairGrad)"/>
    <polygon points="75,36 82,24 90,35" fill="url(#hairGrad)"/>
    <polygon points="110,36 122,25 126,38" fill="url(#hairGrad)"/>

    ${av.detail === 'samurai_knot' ? `
      <!-- Samurai Topknot -->
      <ellipse cx="100" cy="18" rx="9" ry="12" fill="${av.hairColor}" stroke="${av.hairHighlight}" stroke-width="1"/>
      <rect x="94" y="24" width="12" height="5" rx="1.5" fill="#f59e0b"/>
    ` : ''}

    <!-- Hair Sheen / Highlight Arc -->
    <path d="M 68,48 Q 100,38 132,48" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="0.55" fill="none"/>
  </g>

  <!-- Polished Outer Border Ring with Premium Metallic Finish -->
  <circle cx="100" cy="100" r="96" fill="none" stroke="${av.accentColor}" stroke-width="3" stroke-opacity="0.85"/>
  <circle cx="100" cy="100" r="94" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.3"/>
</svg>`;
}

for (const av of avatars) {
  const filePath = path.join(avatarsDir, `${av.id}.svg`);
  fs.writeFileSync(filePath, generateSvg(av).trim(), 'utf8');
  console.log(`Generated ${av.id}.svg: ${av.name}`);
}

console.log('All 16 anime avatars generated in /public/avatars/ successfully!');
