// MediAssist - script.js
// Save this file alongside index.html and styles.css

document.addEventListener('DOMContentLoaded', () => {
  // sample data for clinics/doctors (edit as needed)
  const doctors = [
    { id:1, name:"Dr. S. Reddy", specialty:"General Physician", timings:"Mon-Fri 10:00–14:00", phone:"+91-8888000011", clinic:"Karedu Primary Health Centre", lat:14.0006, lon:79.9763, tele:true, notes:"Handles general ailments, fever, minor injuries." },
    { id:2, name:"Dr. A. Devi", specialty:"Pediatrics", timings:"Tue,Thu 09:00–13:00", phone:"+91-8888000012", clinic:"Kuppam Clinic", lat:13.9991, lon:79.9902, tele:false, notes:"Vaccination schedule available; growth monitoring." },
    { id:3, name:"Dr. M. Kumar", specialty:"Gynaecology", timings:"Wed 11:00–15:00", phone:"+91-8888000013", clinic:"Nellore Rural Clinic", lat:14.0120, lon:80.0022, tele:false, notes:"Antenatal checkups and family planning support." },
    { id:4, name:"Dr. R. Khan", specialty:"Cardiology (visits)", timings:"Monthly: 1st Saturday 10:00–13:00", phone:"+91-8888000014", clinic:"Mobile Cardio Camp", lat:14.0062, lon:79.9855, tele:false, notes:"Monthly specialist visit; refer to nearest hospital for emergencies." },
    { id:5, name:"Dr. P. Sharma", specialty:"Dermatology", timings:"Fri 09:30–12:30", phone:"+91-8888000015", clinic:"Village Health Centre - East", lat:13.9950, lon:79.9700, tele:true, notes:"Skin infections, rashes; remote consults available." }
  ];

  // populate year
  document.getElementById('year').textContent = new Date().getFullYear();

  // DOM refs
  const doctorList = document.getElementById('doctorList');
  const specialtyFilter = document.getElementById('specialtyFilter');
  const searchInput = document.getElementById('search');

  // Build specialty options dynamically
  const specialties = Array.from(new Set(doctors.map(d => d.specialty))).sort();
  specialties.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    specialtyFilter.appendChild(opt);
  });

  // Render doctor cards
  function renderList(items){
    doctorList.innerHTML = '';
    if(items.length === 0){
      doctorList.innerHTML = `<div style="color:var(--muted);padding:12px">No doctors found for that filter.</div>`;
      return;
    }
    items.forEach(d => {
      const card = document.createElement('article');
      card.className = 'doctor';
      card.tabIndex = 0;
      card.innerHTML = `
        <div class="doc-avatar" aria-hidden="true">${avatarLetters(d.name)}</div>
        <div class="doc-body">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
            <div>
              <h3 class="doc-name">${escapeHtml(d.name)}</h3>
              <div class="doc-meta">${escapeHtml(d.clinic)} • <span class="badge">${escapeHtml(d.specialty)}</span></div>
              <div class="doc-meta"><span class="time">${escapeHtml(d.timings)}</span></div>
            </div>
            <div style="text-align:right">
              <div class="contact">
                <a href="tel:${d.phone}" class="action-btn" aria-label="Call ${escapeHtml(d.name)}">${d.phone}</a>
              </div>
              <div style="margin-top:8px">
                <button class="action-btn details" data-id="${d.id}" aria-label="View details for ${escapeHtml(d.name)}">Details</button>
              </div>
            </div>
          </div>
        </div>
      `;
      // keyboard: Enter opens details
      card.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') openModal(d.id);
      });
      doctorList.appendChild(card);
    });

    // attach click handlers
    document.querySelectorAll('.details').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = Number(e.currentTarget.dataset.id);
        openModal(id);
      });
    });
  }

  // initial render
  renderList(doctors);

  // filter & search interactions
  specialtyFilter.addEventListener('change', applyFilters);
  searchInput.addEventListener('input', debounce(applyFilters, 200));

  function applyFilters(){
    const specialty = specialtyFilter.value.trim().toLowerCase();
    const q = searchInput.value.trim().toLowerCase();
    const filtered = doctors.filter(d => {
      const matchSpec = !specialty || d.specialty.toLowerCase() === specialty;
      const matchQ = !q || (d.name+ ' ' + d.specialty + ' ' + d.clinic).toLowerCase().includes(q);
      return matchSpec && matchQ;
    });
    renderList(filtered);
    updateChart(filtered); // chart reflects current list for quick insight
    updateMapMarkers(filtered);
  }

  // Modal behaviour
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const closeModalBtn = document.getElementById('closeModal');

  function openModal(id){
    const d = doctors.find(x => x.id === id);
    if(!d) return;
    modalBody.innerHTML = `
      <h2 style="margin-top:0">${escapeHtml(d.name)}</h2>
      <p><strong>Clinic:</strong> ${escapeHtml(d.clinic)}</p>
      <p><strong>Specialty:</strong> ${escapeHtml(d.specialty)}</p>
      <p><strong>Timings:</strong> ${escapeHtml(d.timings)}</p>
      <p><strong>Phone:</strong> <a href="tel:${d.phone}">${d.phone}</a></p>
      <p><strong>Teleconsultation:</strong> ${d.tele ? 'Available' : 'Not available'}</p>
      <p>${escapeHtml(d.notes || '')}</p>
      <p><em>Tap <kbd>Esc</kbd> to close this dialog.</em></p>
    `;
    modal.setAttribute('aria-hidden','false');
    // focus for accessibility
    closeModalBtn.focus();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
  }
  closeModalBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });

  // -- CHART: doctors by specialty (global / filtered)
  const chartCtx = document.getElementById('specialtyChart').getContext('2d');
  let specialtyChart = null;
  function buildChart(initialList){
    const counts = aggregateBySpecialty(initialList);
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    specialtyChart = new Chart(chartCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Number of doctors',
          data,
          backgroundColor: labels.map((_,i) => `rgba(${40 + i*20 % 200}, 100, 200, 0.7)`),
          borderRadius:6,
          barThickness:24
        }]
      },
      options: {
        responsive:true,
        plugins: {
          legend:{display:false},
          tooltip:{callbacks:{label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}`}}
        },
        scales:{
          y:{beginAtZero:true, ticks:{precision:0}}
        }
      }
    });
  }
  function updateChart(currentList){
    if(!specialtyChart) return;
    const counts = aggregateBySpecialty(currentList);
    const labels = Object.keys(counts);
    const data = Object.values(counts);
    specialtyChart.data.labels = labels;
    specialtyChart.data.datasets[0].data = data;
    specialtyChart.update();
  }
  function aggregateBySpecialty(list){
    const map = {};
    list.forEach(d => map[d.specialty] = (map[d.specialty] || 0) + 1);
    // keep stable order (specialties array)
    const sorted = {};
    specialties.forEach(s => { if(map[s]) sorted[s] = map[s]; });
    // in case of new ones
    Object.keys(map).forEach(k=>{ if(!sorted[k]) sorted[k] = map[k]; });
    return sorted;
  }

  // init chart with all doctors
  buildChart(doctors);

  // -- MAP: Leaflet with markers
  const map = L.map('map', { zoomControl:true, dragging:true }).setView([14.001, 79.98], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'© OpenStreetMap contributors'
  }).addTo(map);

  let markersLayer = L.layerGroup().addTo(map);
  function updateMapMarkers(list){
    markersLayer.clearLayers();
    list.forEach(d => {
      if(typeof d.lat === 'number' && typeof d.lon === 'number'){
        const m = L.marker([d.lat, d.lon]).addTo(markersLayer);
        m.bindPopup(`<strong>${escapeHtml(d.name)}</strong><br>${escapeHtml(d.clinic)}<br><a href="tel:${d.phone}">${d.phone}</a>`);
      }
    });
    // adjust bounds if there are markers
    const all = list.filter(d=>d.lat && d.lon).map(d => [d.lat, d.lon]);
    if(all.length > 0){
      map.fitBounds(all, {padding:[40,40]});
    }
  }
  // initial markers
  updateMapMarkers(doctors);

  // Utility helpers
  function avatarLetters(name){
    return name.split(' ').slice(0,2).map(s => s[0]).join('').toUpperCase();
  }
  function escapeHtml(s){
    if(!s) return '';
    return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
  }
  function debounce(fn, ms=200){
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), ms); }
  }

  // expose open modal buttons to card clicks (already done)
  // update chart & map when user filters initially (already called by render)
  // Provide small accessibility: focus outlines for keyboard
  document.querySelectorAll('button, a, input, select').forEach(el => {
    el.addEventListener('focus', () => el.style.boxShadow = '0 6px 20px rgba(16,24,40,0.08)');
    el.addEventListener('blur', () => el.style.boxShadow = 'none');
  });

  // For demo: open modal on first doctor when URL has #doc-<id>
  const hash = location.hash;
  if(hash && hash.startsWith('#doc-')){
    const id = Number(hash.replace('#doc-',''));
    if(id) openModal(id);
  }
});
