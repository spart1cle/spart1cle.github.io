// ── Research Log archive: tag filters + histogram archive ───────────────
// Mirrors the sidebar behavior of the Thoughts page. Cards are rendered
// statically by the generator with data-date and data-tags attributes;
// this script builds the tag list and month histogram from the DOM and
// filters the cards client-side.
(function () {
  'use strict';

  var listEl = document.getElementById('log-archive-list');
  if (!listEl) return;
  var tagFiltersEl = document.getElementById('log-tag-filters');
  var archiveEl = document.getElementById('log-archive-years');
  var countEl = document.getElementById('log-count');
  var clearTagsBtn = document.getElementById('log-clear-tags');
  var clearMonthBtn = document.getElementById('log-clear-month');

  var MONTH_LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MAX_BAR_HEIGHT = 40;

  var cards = Array.prototype.slice.call(
    listEl.querySelectorAll('.log-archive-card'));
  var activeTags = {};
  var activeMonth = null;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function cardTags(card) {
    return (card.getAttribute('data-tags') || '').split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function cardMonth(card) {
    return (card.getAttribute('data-date') || '').slice(0, 7);
  }

  function renderTags() {
    var tagMap = {};
    cards.forEach(function (card) {
      cardTags(card).forEach(function (tag) {
        tagMap[tag] = (tagMap[tag] || 0) + 1;
      });
    });
    var sorted = Object.keys(tagMap).sort(function (a, b) {
      return a.localeCompare(b);
    });
    tagFiltersEl.innerHTML = sorted.map(function (name) {
      var active = activeTags[name] ? ' active' : '';
      return '<button class="filter-btn tag-filter-btn' + active + '" data-tag="' +
        escapeHtml(name) + '">' + escapeHtml(name) +
        ' <span class="tag-count">' + tagMap[name] + '</span></button>';
    }).join('');
    tagFiltersEl.querySelectorAll('.tag-filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleTag(btn.getAttribute('data-tag'));
      });
    });
  }

  function renderArchive() {
    if (!archiveEl) return;
    var density = {};
    cards.forEach(function (card) {
      var key = cardMonth(card);
      if (!key) return;
      density[key] = (density[key] || 0) + 1;
    });
    var years = {};
    Object.keys(density).forEach(function (key) {
      years[key.slice(0, 4)] = true;
    });
    var sortedYears = Object.keys(years).sort(function (a, b) {
      return b < a ? -1 : 1;
    });
    if (!sortedYears.length) {
      archiveEl.innerHTML = '';
      return;
    }
    var maxCount = Math.max.apply(null, Object.keys(density).map(function (k) {
      return density[k];
    }));
    var html = '<div class="archive-years-row">';
    sortedYears.forEach(function (year) {
      html += '<div class="archive-year">';
      html += '<span class="archive-year-label">' + year + '</span>';
      html += '<div class="archive-bars">';
      for (var m = 0; m < 12; m++) {
        var key = year + '-' + ('0' + (m + 1)).slice(-2);
        var count = density[key] || 0;
        var height = count > 0
          ? Math.max(4, Math.round((count / maxCount) * MAX_BAR_HEIGHT))
          : 2;
        var level = count === 0 ? 'empty'
          : count <= maxCount * 0.25 ? 'L1'
          : count <= maxCount * 0.5 ? 'L2'
          : count <= maxCount * 0.75 ? 'L3' : 'L4';
        var cls = 'archive-bar archive-bar-' + level +
          (activeMonth === key ? ' active' : '');
        var tip = MONTH_NAMES[m] + ' ' + year + ' (' + count +
          (count === 1 ? ' entry)' : ' entries)');
        html += '<button class="' + cls + '" data-month="' + key +
          '" style="height:' + height + 'px" title="' + tip +
          '" aria-label="' + tip + '"></button>';
      }
      html += '</div>';
      html += '<div class="archive-months">' +
        MONTH_LABELS.map(function (l) { return '<span>' + l + '</span>'; }).join('') +
        '</div>';
      html += '</div>';
    });
    html += '</div>';
    archiveEl.innerHTML = html;
    archiveEl.querySelectorAll('.archive-bar').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-month');
        activeMonth = (activeMonth === key) ? null : key;
        renderArchive();
        applyFilters();
      });
    });
  }

  function toggleTag(tag) {
    if (activeTags[tag]) delete activeTags[tag];
    else activeTags[tag] = true;
    renderTags();
    applyFilters();
  }

  function monthLabel(ym) {
    var p = ym.split('-');
    return new Date(+p[0], +p[1] - 1, 1).toLocaleDateString('en-US', {
      month: 'long', year: 'numeric'
    });
  }

  function renderGroupHeadings() {
    listEl.querySelectorAll('.thought-date-group').forEach(function (h) {
      h.remove();
    });
    var lastMonth = '';
    cards.forEach(function (card) {
      if (card.style.display === 'none') return;
      var m = cardMonth(card);
      if (m && m !== lastMonth) {
        var h3 = document.createElement('h3');
        h3.className = 'thought-date-group';
        h3.textContent = monthLabel(m);
        listEl.insertBefore(h3, card);
        lastMonth = m;
      }
    });
  }

  function applyFilters() {
    var shown = 0;
    cards.forEach(function (card) {
      var tags = cardTags(card);
      var okTags = Object.keys(activeTags).every(function (t) {
        return tags.indexOf(t) !== -1;
      });
      var okMonth = !activeMonth || cardMonth(card) === activeMonth;
      var show = okTags && okMonth;
      card.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    if (countEl) {
      countEl.textContent = shown + (shown === 1 ? ' entry' : ' entries');
    }
    if (clearTagsBtn) {
      clearTagsBtn.style.display = Object.keys(activeTags).length ? '' : 'none';
    }
    if (clearMonthBtn) {
      clearMonthBtn.style.display = activeMonth ? '' : 'none';
    }
    listEl.querySelectorAll('.reading-tag').forEach(function (chip) {
      chip.classList.toggle('active', !!activeTags[chip.getAttribute('data-tag')]);
    });
    renderGroupHeadings();
  }

  // Tag chips on cards toggle the matching sidebar filter; clicking
  // anywhere else on a card opens that day's entry.
  function cardEntryUrl(card) {
    var link = card.querySelector('.log-archive-body');
    return link ? link.getAttribute('href') : null;
  }
  listEl.addEventListener('click', function (e) {
    var chip = e.target.closest ? e.target.closest('.reading-tag[data-tag]') : null;
    if (chip) {
      // Stop the document-level handler in script.js from navigating to reading.html.
      if (e.stopPropagation) e.stopPropagation();
      toggleTag(chip.getAttribute('data-tag'));
      return;
    }
    var card = e.target.closest ? e.target.closest('.log-archive-card') : null;
    if (card && !e.target.closest('a')) {
      var url = cardEntryUrl(card);
      if (url) window.location.href = url;
    }
  });
  listEl.addEventListener('keydown', function (e) {
    var card = e.target && e.target.classList &&
      e.target.classList.contains('log-archive-card') ? e.target : null;
    if (card && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      var url = cardEntryUrl(card);
      if (url) window.location.href = url;
    }
  });
  cards.forEach(function (card) { card.setAttribute('tabindex', '0'); });

  if (clearTagsBtn) {
    clearTagsBtn.addEventListener('click', function () {
      activeTags = {};
      renderTags();
      applyFilters();
    });
  }
  if (clearMonthBtn) {
    clearMonthBtn.addEventListener('click', function () {
      activeMonth = null;
      renderArchive();
      applyFilters();
    });
  }

  renderTags();
  renderArchive();
  applyFilters();
})();
