const data = window.ONI_ARCHIVE_DATA;
const entries = data.entries;
let selectedCategory = 'All Sectors';
const categoryDisplayMap = {
  'Orientation': 'Orientation',
  'Chronological Archive': 'Chronological Archive',
  'Entity Registries': 'Entity Registries',
  'Reference Annex': 'Reference Annex'
};
let currentId = null;
let currentSearch = '';
const unlockedDocs = new Set(JSON.parse(sessionStorage.getItem('oni-unlocked-docs') || '[]'));


const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatWords(n) {
  return Intl.NumberFormat().format(n);
}


function bootSequence() {
  const boot = $('boot');
  const bootText = $('bootText');
  const enterBtn = $('enterBtn');
  const authBtn = $('authBtn');
  const bootUser = $('bootUser');
  const bootPass = $('bootPass');
  const bootAuth = $('bootAuth');

  const runSequence = () => {
    const user = bootUser.value.trim();
    const pass = bootPass.value.trim();
    if (!user) {
      bootUser.focus();
      return;
    }
    if (!pass) {
      bootPass.focus();
      return;
    }

    bootAuth.hidden = true;
    bootText.hidden = false;
    bootText.textContent = '';
    enterBtn.hidden = true;
    authBtn.disabled = true;

    const lines = [
      'RECEIVING USER CREDENTIALS...',
      `USER DESIGNATION ACCEPTED: ${user.toUpperCase()}`,
      'VERIFYING AUTHORIZATION KEY...',
      'ESTABLISHING SECTION III HANDSHAKE...',
      'INITIALIZING SECURE SHELL...',
      'MOUNTING ARCHIVAL PACKAGE...',
      `RECORDS INDEXED: ${data.count}`,
      `TOTAL WORDS: ${formatWords(data.totalWords)}`,
      'CANON BOUNDARY: CORE CONTINUITY ONLY',
      'ANCILLARY TIMELINES: EXCLUDED',
      'CLEARANCE TOKEN ACCEPTED',
      'SESSION STATUS: AUTHENTICATED',
      'WELCOME, ARCHIVIST.'
    ];

    let idx = 0;
    function typeNext() {
      if (idx >= lines.length) {
        enterBtn.hidden = false;
        enterBtn.classList.add('ready');
        enterBtn.focus();
        return;
      }
      bootText.textContent += `> ${lines[idx]}
`;
      idx++;
      setTimeout(typeNext, idx < 4 ? 130 : 95);
    }
    typeNext();
  };

  authBtn.addEventListener('click', runSequence);
  [bootUser, bootPass].forEach(el => el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') runSequence();
  }));
  enterBtn.addEventListener('click', () => boot.classList.add('hidden'));
  setTimeout(() => bootUser.focus(), 50);
}


function setClock() {
  const d = new Date();
  $('clock').textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function renderStats() {
  $('stats').innerHTML = `
    <span>${data.count} records</span>
    <span>${formatWords(data.totalWords)} words</span>
    <span>${data.categories.length} sectors</span>
  `;
}

function categoriesWithCounts() {
  const counts = new Map();
  for (const e of entries) counts.set(e.category, (counts.get(e.category) || 0) + 1);
  return [['All Sectors', entries.length], ...Array.from(counts.entries())];
}

function renderCategories() {
  $('categoryList').innerHTML = categoriesWithCounts().map(([name, count]) => `
    <button class="cat-btn ${name === selectedCategory ? 'active' : ''}" data-category="${escapeHtml(name)}">
      ${escapeHtml(categoryDisplayMap[name] || name)} <span class="cat-count">${count}</span>
    </button>
  `).join('');
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.category;
      renderCategories();
      renderFileList();
    });
  });
}

function searchableText(e) {
  return `${e.title} ${e.file} ${e.category} ${e.classification} ${e.text}`.toLowerCase();
}

function scoreEntry(e, terms) {
  const title = e.title.toLowerCase();
  const file = e.file.toLowerCase();
  const full = searchableText(e);
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (title.includes(term)) score += 12;
    if (file.includes(term)) score += 8;
    const count = (full.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    score += Math.min(count, 12);
  }
  return score;
}

function filteredEntries() {
  let list = entries.slice();
  if (selectedCategory !== 'All Sectors') list = list.filter(e => e.category === selectedCategory);
  const q = currentSearch.trim().toLowerCase();
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    list = list.map(e => ({ e, score: scoreEntry(e, terms) })).filter(x => x.score > 0).sort((a,b) => b.score - a.score || (a.e.volume ?? 9999) - (b.e.volume ?? 9999)).map(x => x.e);
  }
  return list;
}

function renderFileList() {
  const list = filteredEntries();
  if (!list.length) {
    $('fileList').innerHTML = '<div class="empty">No matching records found in the archive.</div>';
    return;
  }
  $('fileList').innerHTML = list.map(e => `
    <button class="file-btn ${e.id === currentId ? 'active' : ''}" data-id="${e.id}">
      <span>${escapeHtml(e.volume !== null ? String(e.volume).padStart(2, '0') + ' // ' : '')}${escapeHtml(e.title)}</span>
      <small>${escapeHtml(e.category)} · ${formatWords(e.wordCount)} words</small>
      <small class="classification">${escapeHtml(e.classification)}</small>
    </button>
  `).join('');
  document.querySelectorAll('.file-btn').forEach(btn => btn.addEventListener('click', () => openDoc(btn.dataset.id)));
}

function renderText(text, query = '') {
  const lines = text.split('\n');
  let out = [];
  let paragraph = [];
  let list = [];
  let pre = [];
  let inPre = false;

  function flushPara() {
    if (paragraph.length) {
      let joined = paragraph.join(' ');
      out.push(`<p>${highlight(escapeHtml(joined), query)}</p>`);
      paragraph = [];
    }
  }
  function flushList() {
    if (list.length) {
      out.push(`<ul>${list.map(item => `<li>${highlight(escapeHtml(item), query)}</li>`).join('')}</ul>`);
      list = [];
    }
  }
  function flushPre() {
    if (pre.length) {
      out.push(`<pre>${highlight(escapeHtml(pre.join('\n')), query)}</pre>`);
      pre = [];
      inPre = false;
    }
  }

  for (let raw of lines) {
    const line = raw.replace(/\t/g, '    ');
    const trimmed = line.trim();
    const isRule = trimmed && /^=+$/.test(trimmed);
    const isTable = /^[+|]/.test(trimmed) || /^[-]{3,}$/.test(trimmed);

    if (isTable) {
      flushPara(); flushList();
      pre.push(line);
      inPre = true;
      continue;
    } else if (inPre && trimmed === '') {
      pre.push(line);
      continue;
    } else if (inPre) {
      flushPre();
    }

    if (!trimmed) {
      flushPara(); flushList(); flushPre();
      continue;
    }
    if (isRule) {
      flushPara(); flushList(); flushPre();
      out.push('<div class="hr"></div>');
      continue;
    }
    let m = trimmed.match(/^##\s+(.+)/);
    if (m) {
      flushPara(); flushList(); flushPre();
      const id = slug(m[1]);
      out.push(`<h2 id="${id}">${highlight(escapeHtml(m[1]), query)}</h2>`);
      continue;
    }
    m = trimmed.match(/^###\s+(.+)/);
    if (m) {
      flushPara(); flushList(); flushPre();
      const id = slug(m[1]);
      out.push(`<h3 id="${id}">${highlight(escapeHtml(m[1]), query)}</h3>`);
      continue;
    }
    m = trimmed.match(/^[*•-]\s+(.+)/);
    if (m) {
      flushPara(); flushPre();
      list.push(m[1]);
      continue;
    }
    paragraph.push(trimmed);
  }
  flushPara(); flushList(); flushPre();
  return out.join('\n');
}

function highlight(safeHtml, query) {
  const q = query.trim();
  if (!q || q.length < 2) return safeHtml;
  const terms = q.split(/\s+/).filter(t => t.length > 1).slice(0, 8);
  let result = safeHtml;
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  }
  return result;
}




function saveUnlockedDocs() {
  sessionStorage.setItem('oni-unlocked-docs', JSON.stringify(Array.from(unlockedDocs)));
}

function isClassifiedDoc(e) {
  return e.classification !== 'DECLASSIFIED INDEX';
}

function renderLockOverlay(e) {
  const overlay = $('lockOverlay');
  const panel = $('documentPanel');
  if (!overlay || !panel) return;
  if (!isClassifiedDoc(e) || unlockedDocs.has(e.id)) {
    overlay.hidden = true;
    overlay.innerHTML = '';
    panel.classList.remove('locked');
    return;
  }
  panel.classList.add('locked');
  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="lock-card">
      <div class="eyebrow">SECTION III ACCESS GATE</div>
      <h3>${escapeHtml(e.classification)}</h3>
      <p>Authorization required. Enter a passphrase to continue to the requested record.</p>
      <label class="lock-label" for="docPassword">CLEARANCE PASSPHRASE</label>
      <div class="lock-input-row">
        <input id="docPassword" type="password" autocomplete="off" placeholder="Enter passphrase" />
        <button id="unlockDocBtn" type="button">Unlock File</button>
      </div>
      <div class="lock-help">Section III authentication gateway.</div>
    </div>
  `;
  const input = $('docPassword');
  const button = $('unlockDocBtn');
  const unlock = () => {
    if (!input.value.trim()) {
      input.focus();
      return;
    }
    unlockedDocs.add(e.id);
    saveUnlockedDocs();
    renderLockOverlay(e);
  };
  button.addEventListener('click', unlock);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') unlock();
  });
  setTimeout(() => input.focus(), 0);
}



function getVisualBundle(e) {
  const v = e.volume ?? -1;
  const title = `${e.title} ${e.file}`.toLowerCase();

  const byTitle = [
    {
      matches: ['flood'],
      banner: 'assets/flood-banner.svg',
      caption: 'Flood threat file — parasite biology, Graveminds, logic plague, and containment doctrine.',
      cards: [
        ['assets/flood-forms.svg', 'Flood forms', 'Core Flood combat and infection forms that commonly appear in parasite records.'],
        ['assets/flood-cycle.svg', 'Infestation cycle', 'A simplified progression from first contact to organized Flood intelligence.'],
        ['assets/installation-network.svg', 'Containment network', 'Halo Array, the Ark, and related installations in the anti-Flood system.'],
        ['assets/timeline-overview.svg', 'Era placement', 'Where Flood-related crises sit within the broader chronology.']
      ]
    },
    {
      matches: ['forerunner','precursor','halo array','shield world','installation','zeta halo','the ark'],
      banner: 'assets/forerunner-banner.svg',
      caption: 'Forerunner and deep-history archive — precursor context, ecumene civilization, and galaxy-scale infrastructure.',
      cards: [
        ['assets/halo-ring-cutaway.svg', 'Halo ring cutaway', 'A spatial overview of a standard Halo installation.'],
        ['assets/forerunner-society.svg', 'Forerunner society', 'Simplified orientation chart for major Forerunner rates and functions.'],
        ['assets/installation-network.svg', 'Installation network', 'Halo rings, the Ark, and other major megastructures.'],
        ['assets/timeline-overview.svg', 'Deep-history chronology', 'Ancient eras from Precursors through the Array firing.']
      ]
    },
    {
      matches: ['covenant','schism','harvest','reach','halo 2','halo 3','odst','contact'],
      banner: 'assets/covenant-banner.svg',
      caption: 'Covenant-era archive — faction hierarchy, species coalitions, and warfront operations.',
      cards: [
        ['assets/covenant-hierarchy.svg', 'Covenant hierarchy', 'Political and military ordering during the Hierarchic Covenant.'],
        ['assets/covenant-fleet.svg', 'Covenant war assets', 'Representative warship layout and fleet-role reference.'],
        ['assets/timeline-overview.svg', 'War chronology', 'Major eras from prehistory through the Human-Covenant War.'],
        ['assets/faction-network.svg', 'Faction network', 'UNSC, ONI, Covenant, Banished, Forerunners, and Flood at a glance.']
      ]
    },
    {
      matches: ['spartan','orion','mjolnir','odst','unsc','oni','infinity'],
      banner: 'assets/unsc-banner.svg',
      caption: 'Human military archive — ONI, UNSC command structure, and special operations programs.',
      cards: [
        ['assets/spartan-programs.svg', 'Spartan program lineage', 'ORION through SPARTAN-IV in one compact progression chart.'],
        ['assets/mjolnir-schematic.svg', 'MJOLNIR system overview', 'Subsystem-oriented schematic used for Spartan and armor records.'],
        ['assets/unsc-fleet.svg', 'UNSC fleet profile', 'Representative vessel categories referenced in war and post-war files.'],
        ['assets/faction-network.svg', 'Power network', 'Where ONI and the UNSC sit among other major powers.']
      ]
    },
    {
      matches: ['banished','atriox'],
      banner: 'assets/banished-banner.svg',
      caption: 'Banished archive — post-Covenant mercenary empire, Ark campaign, and Zeta Halo operations.',
      cards: [
        ['assets/banished-command.svg', 'Banished organization', 'A command-lattice overview centered on Atriox and field structure.'],
        ['assets/banished-arsenal.svg', 'Banished war assets', 'Representative Banished vessels, troops, and siege systems.'],
        ['assets/faction-network.svg', 'Faction network', 'Banished position relative to the UNSC, Covenant legacy, and the Flood.'],
        ['assets/timeline-overview.svg', 'Era placement', 'Banished conflicts within the larger Halo chronology.']
      ]
    },
    {
      matches: ['created','cortana','guardian','domain','infinite'],
      banner: 'assets/created-banner.svg',
      caption: 'Created-era archive — AI hegemony, Guardians, and the lead-in to Halo Infinite.',
      cards: [
        ['assets/guardian-network.svg', 'Guardian network', 'Simplified Created control topology centered on Guardian deployment.'],
        ['assets/faction-network.svg', 'Power network', 'The shifting balance between AI, human, and post-Covenant factions.'],
        ['assets/timeline-overview.svg', 'Late chronology', 'Created occupation and Banished conflict in the late chronology.'],
        ['assets/halo-ring-cutaway.svg', 'Zeta Halo context', 'Useful visual context for late-era records tied to Installation 07.']
      ]
    },
    {
      matches: ['source','index','canon','reference','glossary','checklist','cross reference','micro lore'],
      banner: 'assets/unsc-banner.svg',
      caption: 'Reference sector — orientation materials, indexes, and source-routing aids for the archive.',
      cards: [
        ['assets/source-ecosystem.svg', 'Source ecosystem', 'How games, novels, comics, logs, and reference works feed the archive.'],
        ['assets/timeline-overview.svg', 'Master chronology', 'Quick orientation to the archive’s timeline structure.'],
        ['assets/faction-network.svg', 'Faction network', 'A cross-setting relationship map for major powers.'],
        ['assets/installation-network.svg', 'Installation network', 'Reference map for rings and related megastructures.']
      ]
    }
  ];

  for (const bundle of byTitle) {
    if (bundle.matches.some(m => title.includes(m))) return bundle;
  }

  if (v >= 3 && v <= 10) return { banner: 'assets/forerunner-banner.svg', caption: 'Early chronology archive — Precursors, Forerunners, ancient humanity, and the Halo Array.', cards: [
    ['assets/timeline-overview.svg', 'Master chronology', 'Major eras across the Halo setting.'],
    ['assets/halo-ring-cutaway.svg', 'Halo ring cutaway', 'Spatial orientation for Halo Array references.'],
    ['assets/forerunner-society.svg', 'Forerunner society', 'Simplified structure for pre-Array records.'],
    ['assets/installation-network.svg', 'Installation network', 'Key Forerunner megastructures and array context.']
  ] };
  if (v >= 11 && v <= 24) return { banner: 'assets/covenant-banner.svg', caption: 'War-era archive — Covenant rise, first contact, and the Human-Covenant War.', cards: [
    ['assets/timeline-overview.svg', 'War chronology', 'Major campaign eras and narrative waypoints.'],
    ['assets/covenant-hierarchy.svg', 'Covenant hierarchy', 'Command and species ordering for war-era records.'],
    ['assets/covenant-fleet.svg', 'Covenant war assets', 'Common naval context for battles and fleets.'],
    ['assets/spartan-programs.svg', 'Spartan programs', 'Program progression during humanity’s war years.']
  ] };
  if (v >= 25 && v <= 37) return { banner: 'assets/created-banner.svg', caption: 'Post-war archive — shield worlds, ONI operations, Reclaimer conflicts, Created occupation, and Infinite-era events.', cards: [
    ['assets/faction-network.svg', 'Faction network', 'Key powers and the conflict landscape.'],
    ['assets/guardian-network.svg', 'Guardian network', 'Created command and enforcement context.'],
    ['assets/timeline-overview.svg', 'Late chronology', 'Post-war to Infinite positioning.'],
    ['assets/halo-ring-cutaway.svg', 'Installation context', 'Useful orientation for Zeta Halo and related records.']
  ] };
  if (v >= 38 && v <= 53) return { banner: 'assets/unsc-banner.svg', caption: 'Registry sector — characters, factions, species, weapons, armor, worlds, and installations.', cards: [
    ['assets/faction-network.svg', 'Faction network', 'Big-picture context for key powers.'],
    ['assets/source-ecosystem.svg', 'Source ecosystem', 'How the archive draws from across the canon.'],
    ['assets/installation-network.svg', 'Installation network', 'Reference map for rings and megastructures.'],
    ['assets/mjolnir-schematic.svg', 'MJOLNIR overview', 'Useful technical context for armor and Spartan entries.']
  ] };
  return { banner: 'assets/unsc-banner.svg', caption: 'Archive node — browse the records by chronology, registry, and source track.', cards: [
    ['assets/timeline-overview.svg', 'Master chronology', 'The major eras covered by this archive.'],
    ['assets/source-ecosystem.svg', 'Source ecosystem', 'The types of material synthesized into the archive.'],
    ['assets/faction-network.svg', 'Faction network', 'High-level power relationships across the setting.'],
    ['assets/installation-network.svg', 'Installation network', 'Reference orientation for rings and related installations.']
  ] };
}

function renderVisualPanel(e) {
  const bundle = getVisualBundle(e);
  if (!bundle) {
    $('visualPanel').innerHTML = '';
    return;
  }
  const cards = (bundle.cards || []).slice(0, 4).map(([src, title, desc]) => `
    <figure class="visual-card">
      <div class="visual-media-frame">
        <img src="${src}" alt="${escapeHtml(title)}" loading="lazy" />
      </div>
      <figcaption class="visual-caption"><strong>${escapeHtml(title)}</strong>${escapeHtml(desc)}</figcaption>
    </figure>
  `).join('');
  $('visualPanel').innerHTML = `
    <figure class="visual-banner">
      <div class="visual-media-frame visual-banner-frame">
        <img src="${bundle.banner}" alt="Archive sector banner" />
      </div>
      <figcaption class="visual-caption">${escapeHtml(bundle.caption)}</figcaption>
    </figure>
    <div class="visual-grid">${cards}</div>
  `;
}

function openDoc(id) {
  const e = entries.find(x => x.id === id) || entries[0];
  currentId = e.id;
  $('crumbs').textContent = `ARCHIVE / ${e.category.toUpperCase()} / ${e.file}`;
  $('docTitle').textContent = e.title;
  renderVisualPanel(e);
  renderLockOverlay(e);
  $('docMeta').innerHTML = `
    <span class="chip danger">${escapeHtml(e.classification)}</span>
    <span class="chip amber">${escapeHtml(e.file)}</span>
    <span class="chip">${escapeHtml(e.category)}</span>
    <span class="chip">${formatWords(e.wordCount)} words</span>
    <span class="chip">${e.sections.length} sections</span>
  `;
  if (e.sections.length) {
    $('outline').innerHTML = e.sections.slice(0, 28).map(s => `<button data-section="${slug('SECTION ' + s.code + ' — ' + s.title)}">${escapeHtml(s.code)} // ${escapeHtml(s.title)}</button>`).join('') + (e.sections.length > 28 ? `<button disabled>+${e.sections.length - 28} more</button>` : '');
    $('outline').style.display = 'flex';
    $('outline').querySelectorAll('button[data-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.section);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  } else {
    $('outline').style.display = 'none';
  }
  $('documentBody').innerHTML = renderText(e.text, currentSearch);
  renderFileList();
  localStorage.setItem('oni-current-id', e.id);
}

function initSearch() {
  const input = $('searchInput');
  input.addEventListener('input', () => {
    currentSearch = input.value;
    renderFileList();
    if (currentId) {
      const e = entries.find(x => x.id === currentId);
      if (e) $('documentBody').innerHTML = renderText(e.text, currentSearch);
    }
  });
  window.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      input.focus();
      input.select();
    }
    if (ev.key === 'Escape' && document.activeElement === input) {
      input.value = '';
      currentSearch = '';
      renderFileList();
      input.blur();
    }
  });
}

function initToolbar() {
  $('timelineBtn').addEventListener('click', () => openDoc('01-master-timeline'));
  $('randomBtn').addEventListener('click', () => {
    const pool = entries.filter(e => e.volume !== null && e.volume >= 3 && e.volume <= 63);
    openDoc(pool[Math.floor(Math.random() * pool.length)].id);
  });
  $('copyRefBtn').addEventListener('click', async () => {
    const e = entries.find(x => x.id === currentId);
    if (!e) return;
    const ref = `${e.title} (${e.file})`;
    try {
      await navigator.clipboard.writeText(ref);
      $('copyRefBtn').textContent = 'Transmitted';
      setTimeout(() => $('copyRefBtn').textContent = 'Transmit Ref', 900);
    } catch {
      alert(ref);
    }
  });
}

function init() {
  bootSequence();
  setClock();
  setInterval(setClock, 1000);
  renderStats();
  renderCategories();
  initSearch();
  initToolbar();
  const saved = localStorage.getItem('oni-current-id');
  openDoc(saved || '01-master-timeline');
}

init();
