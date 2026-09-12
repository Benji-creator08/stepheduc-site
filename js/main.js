/* ============================================================
   STEPH'EDUC — script principal
   - Menu mobile + rubrique active dans la navigation
   - Révélation discrète des blocs au scroll
   - Sélecteur « Qu'est-ce qui vous amène ? »
   - (le mini-diagnostic est dans js/diagnostic.js)
   - Carrousels (points de navigation)
   - FAQ (une seule question ouverte à la fois)
   - Formulaire de contact (envoi en arrière-plan + solution de secours)
   - Vérificateur de zone d'intervention
   - Bouton « retour en haut »
   ============================================================ */

/* --- Base de communes autour de Louveciennes ---
   Coordonnées approximatives (usage indicatif uniquement, voir la note
   affichée à côté du vérificateur). Pas d'API/clé nécessaire : la distance
   est calculée localement avec la formule de Haversine. */
const LOUVECIENNES = { lat: 48.8637, lng: 2.1246 };
const TOWNS = [
  { name: "Louveciennes", lat: 48.8637, lng: 2.1246 },
  { name: "Marly-le-Roi", lat: 48.8734, lng: 2.0913 },
  { name: "Le Chesnay-Rocquencourt", lat: 48.8177, lng: 2.1156 },
  { name: "Versailles", lat: 48.8049, lng: 2.1204 },
  { name: "Saint-Germain-en-Laye", lat: 48.8975, lng: 2.0936 },
  { name: "Bougival", lat: 48.8631, lng: 2.1449 },
  { name: "La Celle-Saint-Cloud", lat: 48.8582, lng: 2.1387 },
  { name: "Rueil-Malmaison", lat: 48.8770, lng: 2.1806 },
  { name: "Chatou", lat: 48.8834, lng: 2.1569 },
  { name: "Croissy-sur-Seine", lat: 48.8747, lng: 2.1327 },
  { name: "Le Vésinet", lat: 48.8907, lng: 2.1332 },
  { name: "Montesson", lat: 48.9020, lng: 2.1500 },
  { name: "Sartrouville", lat: 48.9358, lng: 2.1601 },
  { name: "Maisons-Laffitte", lat: 48.9506, lng: 2.1444 },
  { name: "Poissy", lat: 48.9282, lng: 2.0399 },
  { name: "Chambourcy", lat: 48.9127, lng: 2.0459 },
  { name: "Mareil-Marly", lat: 48.8853, lng: 2.0796 },
  { name: "L'Étang-la-Ville", lat: 48.8746, lng: 2.0729 },
  { name: "Noisy-le-Roi", lat: 48.8482, lng: 2.0813 },
  { name: "Bailly", lat: 48.8408, lng: 2.0757 },
  { name: "Fourqueux", lat: 48.8929, lng: 2.0655 },
  { name: "Saint-Nom-la-Bretèche", lat: 48.8815, lng: 2.0378 },
  { name: "Feucherolles", lat: 48.8747, lng: 1.9975 },
  { name: "Villepreux", lat: 48.8437, lng: 2.0521 },
  { name: "Rennemoulin", lat: 48.8215, lng: 2.0674 },
  { name: "Bois-d'Arcy", lat: 48.8039, lng: 2.0521 },
  { name: "Vélizy-Villacoublay", lat: 48.7823, lng: 2.1907 },
  { name: "Viroflay", lat: 48.8020, lng: 2.1650 },
  { name: "Vaucresson", lat: 48.8382, lng: 2.1596 },
  { name: "Garches", lat: 48.8419, lng: 2.1935 },
  { name: "Saint-Cloud", lat: 48.8422, lng: 2.2118 },
  { name: "Suresnes", lat: 48.8708, lng: 2.2266 },
  { name: "Nanterre", lat: 48.8924, lng: 2.2069 },
  { name: "Conflans-Sainte-Honorine", lat: 48.9989, lng: 2.0997 },
  { name: "Herblay-sur-Seine", lat: 49.0035, lng: 2.1651 },
  { name: "Argenteuil", lat: 48.9477, lng: 2.2469 },
  { name: "Cormeilles-en-Parisis", lat: 48.9698, lng: 2.1997 },
  { name: "Achères", lat: 48.9614, lng: 2.0685 },
  { name: "Trappes", lat: 48.7774, lng: 2.0028 },
  { name: "Guyancourt", lat: 48.7726, lng: 2.0708 },
  { name: "Montigny-le-Bretonneux", lat: 48.7729, lng: 2.0333 },
  { name: "Plaisir", lat: 48.8140, lng: 1.9506 },
  { name: "Élancourt", lat: 48.7871, lng: 1.9583 },
  { name: "Boulogne-Billancourt", lat: 48.8397, lng: 2.2412 },
  { name: "Neuilly-sur-Seine", lat: 48.8846, lng: 2.2698 },
  { name: "Colombes", lat: 48.9228, lng: 2.2547 },
  { name: "Bezons", lat: 48.9109, lng: 2.2020 },
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Meulan-en-Yvelines", lat: 49.0064, lng: 1.9111 },
  { name: "Les Mureaux", lat: 48.9925, lng: 1.9161 },
  { name: "Mantes-la-Jolie", lat: 48.9906, lng: 1.7167 },
  { name: "Rambouillet", lat: 48.6444, lng: 1.8286 },
  { name: "Houdan", lat: 48.7997, lng: 1.5975 },
  { name: "Dreux", lat: 48.7358, lng: 1.3667 },
  { name: "Chartres", lat: 48.4469, lng: 1.4894 }
];

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function normalize(str) {
  // Décompose les accents (NFD) puis retire les marques diacritiques
  // (plage Unicode 0x0300-0x036F, construite via charCode pour éviter
  // tout souci d'encodage d'un caractère littéral dans le fichier source).
  let combiningRange = '';
  for (let code = 0x0300; code <= 0x036f; code++) combiningRange += String.fromCharCode(code);
  const combiningMarks = new RegExp('[' + combiningRange + ']', 'g');
  const withoutDiacritics = str.toLowerCase().normalize('NFD').replace(combiningMarks, '');
  return withoutDiacritics.replace(/[-'\s]/g, ' ').trim();
}

function findTown(query) {
  const q = normalize(query);
  if (!q) return null;
  const exact = TOWNS.find(t => normalize(t.name) === q);
  if (exact) return exact;
  return TOWNS.find(t => normalize(t.name).includes(q) || q.includes(normalize(t.name)));
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Le mini-diagnostic vit dans js/diagnostic.js (données, scoring,
   interprétation et affichage) et s'initialise tout seul. */

document.addEventListener('DOMContentLoaded', () => {

  /* --- Menu mobile --- */
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('main-nav');
  const closeNav = () => {
    if (!nav || !toggle) return;
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
  };
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  }

  /* --- Rubrique active dans la navigation --- */
  const navLinks = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
  const sectionsForNav = navLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if ('IntersectionObserver' in window && sectionsForNav.length) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = '#' + entry.target.id;
        navLinks.forEach(link => link.classList.toggle('is-current', link.getAttribute('href') === id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sectionsForNav.forEach(section => spy.observe(section));
  }

  /* --- Révélation au scroll --- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /* --- Année dynamique --- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* --- Sélecteur « Qu'est-ce qui vous amène ? » --- */
  const tabs = [...document.querySelectorAll('.problem-card[role="tab"]')];
  function selectTab(tab, focus) {
    tabs.forEach(t => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab, false));
    tab.addEventListener('keydown', e => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (e.key in keys) {
        e.preventDefault();
        selectTab(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true);
      } else if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
      else if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1], true); }
    });
  });

  /* --- Carrousels : points de navigation (affichés seulement quand la
     grille devient un bandeau défilant, voir le CSS) --- */
  document.querySelectorAll('[data-carousel]').forEach(track => {
    const items = [...track.children];
    if (items.length < 2) return;
    const dots = document.createElement('div');
    dots.className = 'carousel-dots';
    items.forEach((item, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Aller à l\'élément ' + (i + 1));
      dot.addEventListener('click', () => {
        track.scrollTo({ left: item.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft || 0), behavior: 'smooth' });
      });
      dots.appendChild(dot);
    });
    track.after(dots);

    const update = () => {
      const step = items[1].offsetLeft - items[0].offsetLeft || 1;
      let index = Math.round(track.scrollLeft / step);
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) index = items.length - 1;
      [...dots.children].forEach((d, i) => d.classList.toggle('is-active', i === index));
    };
    track.addEventListener('scroll', () => window.requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* --- FAQ : une seule question ouverte à la fois (complète l'attribut
     `name` natif pour les navigateurs qui ne le gèrent pas encore) --- */
  const faqItems = [...document.querySelectorAll('.faq-item')];
  faqItems.forEach(item => {
    item.addEventListener('toggle', () => {
      if (item.open) faqItems.forEach(other => { if (other !== item) other.open = false; });
    });
  });

  /* --- Formulaire de contact ---
     Le message part en arrière-plan vers FormSubmit, qui le transmet à
     l'adresse de Stéphanie. Chaque champ est envoyé séparément et tel quel :
     le texte du visiteur n'est jamais modifié.
     Si l'envoi automatique échoue (réseau, service indisponible…), le
     visiteur n'est jamais bloqué : on lui propose de l'envoyer en un clic
     par e-mail ou WhatsApp, avec son message déjà prêt. */
  const form = document.getElementById('contact-form');
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('form-submit');
  const CONTACT_EMAIL = 'stephanie_englebert@yahoo.com';
  const WHATSAPP_NUMBER = '33675054564';

  const showStatus = (kind, html) => {
    statusEl.className = 'form-status is-' + kind;
    statusEl.innerHTML = html;
    statusEl.hidden = false;
  };

  if (form && statusEl && submitBtn) {
    const endpoint = form.getAttribute('action').replace('formsubmit.co/', 'formsubmit.co/ajax/');
    const submitLabel = submitBtn.textContent;

    // Message d'erreur affiché sous le champ concerné (texte défini dans le HTML)
    const setFieldError = (field, show) => {
      const error = field.closest('.field') && field.closest('.field').querySelector('.field-error');
      field.classList.toggle('is-invalid', show);
      field.setAttribute('aria-invalid', String(show));
      if (error) error.textContent = show ? (error.dataset.error || '') : '';
    };
    const validatable = [...form.querySelectorAll('.field input, .field textarea')]
      .filter(field => field.required || field.type === 'email');
    validatable.forEach(field => {
      field.addEventListener('input', () => { if (field.classList.contains('is-invalid')) setFieldError(field, !field.checkValidity()); });
      field.addEventListener('blur', () => { if (field.value.trim()) setFieldError(field, !field.checkValidity()); });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const invalid = validatable.filter(field => {
        const bad = !field.checkValidity() || (field.required && !field.value.trim());
        setFieldError(field, bad);
        return bad;
      });
      if (invalid.length) {
        showStatus('error', '<strong>Il manque une information.</strong>Vérifiez les champs indiqués en rouge.');
        invalid[0].focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      if (data._honey) return; // champ piège rempli : envoi automatisé ignoré
      delete data._honey;
      const nom = (data.Nom || '').trim();
      data._subject = 'Nouveau message de ' + (nom || 'un visiteur') + ' — site STEPH\'EDUC';

      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours…';
      statusEl.hidden = true;

      let sent = false;
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await response.json().catch(() => ({}));
        sent = response.ok && String(json.success) === 'true';
      } catch (err) {
        sent = false;
      }

      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;

      if (sent) {
        form.reset();
        showStatus('success', '<strong>Merci, votre message est bien parti&nbsp;!</strong>Je vous réponds sous 24 à 48&nbsp;h.');
        return;
      }

      // Solution de secours : le message du visiteur, et lui seul, est repris
      // tel quel dans le corps du mail / du message WhatsApp.
      const message = (data.Message || '').trim();
      const tel = (data['Téléphone'] || '').trim();
      const sujet = 'Demande de contact — ' + (nom || 'site STEPH\'EDUC') + (tel ? ' — ' + tel : '');
      const mailto = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(message);
      const whatsapp = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
      showStatus('fallback',
        '<strong>Il est prêt&nbsp;: envoyez-le en un clic, ou appelez-moi au <a href="tel:+33675054564">06&nbsp;75&nbsp;05&nbsp;45&nbsp;64</a>.</strong>' +
        '<span class="form-status-actions">' +
          '<a class="btn btn-primary" href="' + escapeHtml(mailto) + '">Envoyer par e-mail</a>' +
          '<a class="btn btn-whatsapp" href="' + escapeHtml(whatsapp) + '" target="_blank" rel="noopener">Envoyer par WhatsApp</a>' +
        '</span>');
    });
  }

  /* --- Vérificateur de zone d'intervention ---
     Recherche : service officiel geo.api.gouv.fr (toutes les communes de
     France, gratuit, sans clé). Si le service ne répond pas, on se rabat sur
     la liste locale TOWNS. Le résultat vient uniquement de la distance réelle
     entre les coordonnées de la commune et Louveciennes : ZONE_KM est un
     repère technique interne, jamais affiché comme une règle stricte. */
  const locateInput = document.getElementById('locate-input');
  const locateBtn = document.getElementById('locate-btn');
  const locateResult = document.getElementById('locate-result');
  const suggestEl = document.getElementById('locate-suggest');
  const mapEl = document.getElementById('locate-map');
  const ZONE_KM = 30;
  const NEAR_EDGE_KM = 50;
  const GEO_API = 'https://geo.api.gouv.fr/communes';
  const TERRAIN = { lat: 48.8853, lng: 2.0796 };

  const showLocateResult = (kind, iconChar, html) => {
    locateResult.className = 'locate-result is-' + kind;
    locateResult.innerHTML = '<span class="locate-icon" aria-hidden="true">' + iconChar + '</span><span>' + html + '</span>';
    locateResult.hidden = false;
  };

  /* Carte */
  let map = null;
  let cityLayer = null;
  const pin = kind => window.L.divIcon({ className: '', html: '<div class="map-pin ' + kind + '"></div>', iconSize: [26, 26], iconAnchor: [4, 26] });

  if (mapEl && window.L) {
    const L = window.L;
    map = L.map(mapEl, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, zoomSnap: 0.5 })
      .setView([LOUVECIENNES.lat, LOUVECIENNES.lng], 9);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18, subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    L.circle([LOUVECIENNES.lat, LOUVECIENNES.lng], {
      radius: ZONE_KM * 1000, color: '#35807F', weight: 1.5, opacity: 0.7, dashArray: '6 6',
      fillColor: '#35807F', fillOpacity: 0.07, interactive: false
    }).addTo(map);
    L.marker([LOUVECIENNES.lat, LOUVECIENNES.lng], { icon: L.divIcon({ className: '', html: '<div class="map-pin is-home"></div>', iconSize: [18, 18], iconAnchor: [3, 18] }) })
      .addTo(map).bindTooltip('Louveciennes', { direction: 'top', offset: [6, -16] });
    L.marker([TERRAIN.lat, TERRAIN.lng], { icon: L.divIcon({ className: '', html: '<div class="map-pin is-home"></div>', iconSize: [18, 18], iconAnchor: [3, 18] }) })
      .addTo(map).bindTooltip('Terrain d\'éducation — Mareil-Marly', { direction: 'top', offset: [6, -16] });
    const refresh = () => map.invalidateSize();
    window.addEventListener('resize', refresh);
    setTimeout(refresh, 400);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) refresh(); }).observe(mapEl);
    }
  } else if (mapEl) {
    // Carte interactive indisponible : carte simple en secours
    mapEl.innerHTML = '<iframe title="Carte centrée sur Louveciennes" src="https://www.google.com/maps?q=Louveciennes&output=embed" width="100%" height="100%" style="border:0" loading="lazy"></iframe>';
  }

  const showOnMap = (commune, ok) => {
    if (!map) return;
    const L = window.L;
    if (cityLayer) cityLayer.remove();
    const color = ok ? '#3E8E6E' : '#A4405A';
    cityLayer = L.layerGroup([
      L.circleMarker([commune.lat, commune.lng], { radius: 24, color: color, weight: 1.5, opacity: 0.9, fillColor: color, fillOpacity: 0.22, interactive: false }),
      L.marker([commune.lat, commune.lng], { icon: pin(ok ? 'is-ok' : 'is-far'), zIndexOffset: 1000 })
        .bindTooltip(commune.name, { direction: 'top', offset: [8, -24], permanent: true })
    ]).addTo(map);
    const same = haversineKm(LOUVECIENNES, commune) < 1;
    if (same) map.setView([commune.lat, commune.lng], 11);
    else map.fitBounds([[LOUVECIENNES.lat, LOUVECIENNES.lng], [commune.lat, commune.lng]], { padding: [50, 50], maxZoom: 11 });
  };

  /* Recherche de communes */
  const toCommune = c => ({
    name: c.nom, dept: c.codeDepartement || '', cp: (c.codesPostaux && c.codesPostaux[0]) || '',
    lat: c.centre.coordinates[1], lng: c.centre.coordinates[0]
  });
  const localSearch = q => {
    const n = normalize(q);
    return TOWNS.filter(t => normalize(t.name).includes(n)).slice(0, 6).map(t => ({ name: t.name, dept: '', cp: '', lat: t.lat, lng: t.lng }));
  };
  let lastController = null;
  const searchCommunes = async q => {
    if (lastController) lastController.abort();
    lastController = new AbortController();
    try {
      const url = GEO_API + '?nom=' + encodeURIComponent(q) + '&fields=nom,code,centre,codeDepartement,codesPostaux&boost=population&limit=6';
      const response = await fetch(url, { signal: lastController.signal });
      if (!response.ok) throw new Error('service');
      const list = await response.json();
      return { ok: true, items: list.filter(c => c.centre).map(toCommune) };
    } catch (err) {
      if (err.name === 'AbortError') return { ok: true, aborted: true, items: [] };
      return { ok: false, items: localSearch(q) };
    }
  };

  /* Suggestions (liste déroulante accessible au clavier) */
  let suggestions = [];
  let activeIndex = -1;
  const closeSuggest = () => {
    suggestEl.hidden = true;
    suggestEl.innerHTML = '';
    locateInput.setAttribute('aria-expanded', 'false');
    locateInput.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  };
  const renderSuggest = () => {
    suggestEl.innerHTML = '';
    if (!suggestions.length) {
      suggestEl.innerHTML = '<li class="locate-suggest-empty" role="option" aria-disabled="true">Aucune commune trouvée</li>';
    }
    suggestions.forEach((c, i) => {
      const li = document.createElement('li');
      li.id = 'locate-opt-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === activeIndex));
      li.innerHTML = '<span>' + escapeHtml(c.name) + '</span>' + (c.dept ? '<small>' + escapeHtml(c.cp || c.dept) + '</small>' : '');
      li.addEventListener('mousedown', e => { e.preventDefault(); chooseCommune(c); });
      suggestEl.appendChild(li);
    });
    suggestEl.hidden = false;
    locateInput.setAttribute('aria-expanded', 'true');
    if (activeIndex >= 0) locateInput.setAttribute('aria-activedescendant', 'locate-opt-' + activeIndex);
  };

  let debounce = null;
  const onType = () => {
    const q = locateInput.value.trim();
    clearTimeout(debounce);
    if (q.length < 2) { closeSuggest(); return; }
    debounce = setTimeout(async () => {
      const res = await searchCommunes(q);
      if (res.aborted || locateInput.value.trim() !== q) return;
      suggestions = res.items;
      activeIndex = -1;
      renderSuggest();
    }, 220);
  };

  /* Verdict — la distance sert au calcul, elle n'est jamais affichée. */
  function chooseCommune(c) {
    closeSuggest();
    locateInput.value = c.name;
    const d = haversineKm(LOUVECIENNES, c);
    const ok = d <= ZONE_KM;
    const name = escapeHtml(c.name) + (c.dept ? ' (' + escapeHtml(c.dept) + ')' : '');
    if (d < 1) {
      showLocateResult('ok', '✓', '<strong>Oui&nbsp;!</strong> Louveciennes, c\'est ici que tout commence.');
    } else if (ok) {
      showLocateResult('ok', '✓', '<strong>Bonne nouvelle : j\'interviens à ' + name + '.</strong> Votre commune fait partie de mon secteur habituel — je me déplace à votre domicile, et mon terrain d\'éducation reste à votre disposition.');
    } else if (d <= NEAR_EDGE_KM) {
      showLocateResult('far', '!', '<strong>' + name + ' est juste en dehors de mon secteur habituel.</strong> Ce n\'est pas une frontière stricte : <a href="#contact">contactez-moi</a>, un déplacement reste souvent possible.');
    } else {
      showLocateResult('far', '✕', '<strong>' + name + ' est en dehors de mon secteur habituel d\'intervention.</strong> Le mieux est de <a href="#contact">me contacter directement</a> pour vérifier ensemble si je peux me déplacer jusqu\'à vous. Vous pouvez aussi venir travailler sur mon terrain d\'éducation à Mareil-Marly.');
    }
    showOnMap(c, ok);
  }

  const bestMatch = (q, list) => list.find(c => normalize(c.name) === normalize(q)) || list[0];
  async function runLocateCheck() {
    const q = locateInput.value.trim();
    if (!q) { showLocateResult('unknown', '?', 'Indiquez le nom de votre commune, par exemple <strong>Versailles</strong>.'); return; }
    if (!suggestEl.hidden && activeIndex >= 0 && suggestions[activeIndex]) { chooseCommune(suggestions[activeIndex]); return; }
    locateBtn.disabled = true;
    const res = await searchCommunes(q);
    locateBtn.disabled = false;
    if (res.aborted) return;
    if (res.items.length) { chooseCommune(bestMatch(q, res.items)); return; }
    closeSuggest();
    if (!res.ok) {
      showLocateResult('unknown', '?', 'La recherche est momentanément indisponible. Indiquez-moi votre commune au <a href="tel:+33675054564">06 75 05 45 64</a> ou via le <a href="#contact">formulaire</a>, je vous réponds rapidement.');
    } else {
      showLocateResult('unknown', '?', 'Je ne trouve pas de commune nommée <strong>« ' + escapeHtml(q) + ' »</strong>. Vérifiez l\'orthographe ou essayez le nom complet de la commune.');
    }
  }

  if (locateInput && locateBtn && locateResult && suggestEl) {
    locateInput.addEventListener('input', onType);
    locateInput.addEventListener('keydown', e => {
      const open = !suggestEl.hidden && suggestions.length;
      if (e.key === 'ArrowDown' && open) { e.preventDefault(); activeIndex = (activeIndex + 1) % suggestions.length; renderSuggest(); }
      else if (e.key === 'ArrowUp' && open) { e.preventDefault(); activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length; renderSuggest(); }
      else if (e.key === 'Enter') { e.preventDefault(); runLocateCheck(); }
      else if (e.key === 'Escape') closeSuggest();
    });
    locateInput.addEventListener('blur', () => setTimeout(closeSuggest, 150));
    locateBtn.addEventListener('click', runLocateCheck);
  }

  /* --- Retour en haut --- */
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    const updateBackToTop = () => backToTop.classList.toggle('is-visible', window.scrollY > 600);
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    updateBackToTop();
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

});
