/* ============================================================
   로뎀나무교회 — 관리 화면 내용 반영 스크립트
   관리 화면(/admin)에서 고친 내용은 content/*.json 파일에 저장됩니다.
   이 스크립트가 그 파일을 읽어서 홈페이지 화면에 그려 줍니다.
   - 파일을 못 읽거나 형식이 틀리면, 페이지에 원래 들어 있던 내용을 그대로 보여줍니다.
   - 사람이 쓴 글은 화면에 넣을 때 항상 '글자'로만 넣습니다(코드로 실행되지 않음).
   ============================================================ */
(function () {
  'use strict';

  var isLocal = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null && text !== '') e.textContent = text;
    return e;
  }
  function str(v) { return v == null ? '' : String(v).trim(); }
  function arr(v) { return Array.isArray(v) ? v : []; }

  /* 사진 주소: 관리 화면으로 올린 사진(assets/img/uploads)은 넷리파이 이미지 변환으로 알맞은 크기로 줄여서 보여줍니다 */
  /* 넷리파이에서 운영할 때만 true. GitHub Pages 등 다른 곳에서는 false (사진을 그대로 불러옵니다) */
  var USE_NETLIFY_IMAGES = false;
  function imgUrl(p, w) {
    p = str(p).replace(/^\/+/, '');
    if (!p) return '';
    if (USE_NETLIFY_IMAGES && !isLocal &&/^assets\/img\/uploads\//i.test(p) && !/\.svg$/i.test(p)) {
      return '/.netlify/images?url=/' + encodeURI(p) + '&w=' + (w || 900) + '&q=80';
    }
    return p;
  }
  function rawUrl(p) { return str(p).replace(/^\/+/, ''); }

  /* 유튜브 주소나 아이디를 붙여 넣어도 아이디만 뽑아 줍니다 */
  function ytId(v) {
    v = str(v);
    var m = v.match(/[?&]v=([A-Za-z0-9_-]{6,})/) || v.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) ||
            v.match(/\/embed\/([A-Za-z0-9_-]{6,})/) || v.match(/\/shorts\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{6,}$/.test(v) ? v : '';
  }
  function ytList(v) {
    v = str(v);
    var m = v.match(/[?&]list=([A-Za-z0-9_-]{6,})/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{6,}$/.test(v) ? v : '';
  }

  function getJSON(name) {
    return fetch('content/' + name + '.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(name + ' ' + r.status);
      return r.json();
    });
  }

  /* ---------------------------------------------------------
     예배 시간 (표 · 첫 화면 · 맨 아래 안내)
     --------------------------------------------------------- */
  function fillTable(table, rows) {
    var body = $('tbody', table);
    if (!body || !rows.length) return;
    var combined = $$('thead th', table).length === 2;
    body.textContent = '';
    rows.forEach(function (r) {
      var tr = el('tr');
      var th = el('th', '', str(r.name)); th.setAttribute('scope', 'row'); tr.appendChild(th);
      var td = el('td');
      var b = el('b', '', str(r.time));
      td.appendChild(b);
      if (combined) { if (str(r.place)) td.appendChild(el('span', 'tt-place', str(r.place))); tr.appendChild(td); }
      else { tr.appendChild(td); tr.appendChild(el('td', '', str(r.place))); }
      body.appendChild(tr);
    });
  }
  function renderWorship(d) {
    var adult = arr(d.adult).filter(function (r) { return str(r.name); });
    var next = arr(d.nextgen).filter(function (r) { return str(r.name); });
    $$('[data-worship="adult"]').forEach(function (t) { fillTable(t, adult); });
    $$('[data-worship="nextgen"]').forEach(function (t) { fillTable(t, next); });

    $$('[data-worship="footer"]').forEach(function (ul) {
      var rows = adult.filter(function (r) { return r.footer !== false; });
      if (!rows.length) return;
      ul.textContent = '';
      rows.forEach(function (r) { ul.appendChild(el('li', '', (str(r.short) || str(r.name)) + ' — ' + str(r.time))); });
    });
    $$('[data-worship="hero"]').forEach(function (dl) {
      var rows = adult.filter(function (r) { return r.hero === true; });
      if (!rows.length) return;
      var keep = $$('[data-keep]', dl);
      var second = next.filter(function (r) { return r.hero === true; });
      dl.textContent = '';
      var add = function (r) {
        var label = str(r.short) || str(r.name);
        var box = el('div');
        box.appendChild(el('dt', 'sr-only', label));
        var dd = el('dd', '', label + ' ');
        dd.appendChild(el('b', '', str(r.time)));
        box.appendChild(dd);
        dl.appendChild(box);
      };
      rows.forEach(add);                                    /* 첫 줄: 장년 예배 + 주소 */
      keep.forEach(function (k) { dl.appendChild(k); });
      second.forEach(add);                                   /* 둘째 줄: 다음세대 예배 (첫 줄과 칸을 맞춤) */
      dl.style.setProperty('--cols', String(Math.max(1, rows.length + keep.length)));
    });
  }

  /* ---------------------------------------------------------
     섬기는 사람들
     --------------------------------------------------------- */
  function renderPeople(d) {
    var section = $('.people-slider');
    var host = section && $('.container', section);
    var list = arr(d.people).filter(function (p) { return str(p.name); });
    if (!host || !list.length) return;

    Array.prototype.slice.call(host.children).forEach(function (ch) {
      if (ch.tagName === 'H3' || ch.classList.contains('grid')) host.removeChild(ch);
    });
    var grid = el('div', 'grid grid-4');
    list.forEach(function (p) {
      var art = el('article', 'person');
      var fig = el('figure', 'photo');
      fig.setAttribute('data-photo', rawUrl(p.photo) || 'assets/img/uploads/none.jpg');
      fig.setAttribute('data-label', str(p.name) + ' 사진');
      fig.setAttribute('data-alt', str(p.name) + (str(p.role) ? ' ' + str(p.role) : ''));
      fig.setAttribute('data-size', '세로형 900×1200px 이상 · 얼굴이 선명한 사진');
      var z = parseFloat(p.zoom);
      if (z && z > 1 && z <= 1.6) { fig.style.setProperty('--zd', String(z)); fig.style.setProperty('--zyd', '40%'); }
      art.appendChild(fig);
      art.appendChild(el('p', 'person__name', str(p.name)));
      if (str(p.role)) art.appendChild(el('p', 'person__role', str(p.role)));
      if (str(p.duty)) art.appendChild(el('p', 'person__note', str(p.duty)));
      grid.appendChild(art);
    });
    host.appendChild(grid);
  }

  /* ---------------------------------------------------------
     주보 · 갤러리 · 공지
     --------------------------------------------------------- */
  function zoomButton(src, alt, ratio) {
    var b = el('button', 'zoomimg');
    if (ratio) { b.classList.add('zoomimg--crop'); b.style.aspectRatio = ratio; b.setAttribute('data-ratio', ratio); }
    b.type = 'button';
    b.setAttribute('aria-label', (alt || '사진') + ' 크게 보기');
    b.setAttribute('data-full', imgUrl(src, 1600));
    b.setAttribute('data-raw', rawUrl(src));
    var img = document.createElement('img');
    img.src = imgUrl(src, 800);
    img.alt = alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = function () { if (img.src.indexOf('/.netlify/images') > -1) { img.onerror = null; img.src = rawUrl(src); } };
    b.appendChild(img);
    return b;
  }
  function fmtDate(v) {
    v = str(v);
    if (!v) return '';
    var m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? (m[1] + '. ' + Number(m[2]) + '. ' + Number(m[3]) + '.') : v;
  }
  function delay(i) { return (i % 3) ? String(i % 3) : ''; }

  function renderBulletin(d) {
    var host = $('[data-bulletin]');
    var items = arr(d.items).filter(function (x) { return str(x.image); });
    if (!host || !items.length) return;
    host.textContent = '';
    host.className = 'grid grid-2 bulletin-wide';
    /* 이번 주 주보 = 맨 위 2장(앞면 · 뒷면). 사진 아래쪽 흰 여백은 잘라서 보여 줍니다 (1403×992 → 1403×775) */
    items.slice(0, 2).forEach(function (it, i) {
      var card = el('article', 'card reveal');
      var dl = delay(i); if (dl) card.setAttribute('data-d', dl);
      card.appendChild(zoomButton(it.image, str(it.title) || '주보', '1403 / 775'));
      var body = el('div', 'card__body');
      body.appendChild(el('span', 'card__tag', i === 0 ? '이번 주 · 앞면' : '이번 주 · 뒷면'));
      body.appendChild(el('h3', 'h3', str(it.title) || '주보'));
      if (str(it.date)) body.appendChild(el('p', 'muted small', fmtDate(it.date)));
      card.appendChild(body);
      host.appendChild(card);
    });
  }
  function renderGallery(d) {
    var host = $('[data-gallery]');
    var items = arr(d.items).filter(function (x) { return str(x.image); });
    if (!host || !items.length) return;
    var wrap = el('div', 'masonry');
    items.slice(0, 60).forEach(function (it, i) {
      var f = el('figure', 'gitem reveal');
      f.appendChild(zoomButton(it.image, str(it.caption) || '갤러리 사진'));
      if (str(it.caption)) f.appendChild(el('figcaption', '', str(it.caption)));
      wrap.appendChild(f);
    });
    host.parentNode.replaceChild(wrap, host);
  }
  function renderNotices(d) {
    var host = $('[data-notices]');
    var items = arr(d.items).filter(function (x) { return str(x.title) || str(x.image); });
    if (host && items.length) {
      host.textContent = '';
      items.slice(0, 12).forEach(function (it, i) {
        var card = el('article', 'card reveal');
        var dl = delay(i); if (dl) card.setAttribute('data-d', dl);
        if (str(it.image)) card.appendChild(zoomButton(it.image, str(it.title) || '공지 포스터'));
        var body = el('div', 'card__body');
        if (str(it.tag)) body.appendChild(el('span', 'card__tag', str(it.tag)));
        body.appendChild(el('h3', 'h3', str(it.title)));
        if (str(it.summary)) body.appendChild(el('p', 'muted small', str(it.summary)));
        if (str(it.date)) body.appendChild(el('p', 'muted small', fmtDate(it.date)));
        var link = str(it.link);
        if (/^https?:\/\//i.test(link)) {
          var p = el('p', 'card__foot');
          var a = el('a', 'link-more', '자세히 보기 ↗');
          a.href = link; a.target = '_blank'; a.rel = 'noopener';
          p.appendChild(a); body.appendChild(p);
        }
        card.appendChild(body);
        host.appendChild(card);
      });
    }
    var info = $('[data-info]');
    var blocks = arr(d.info).filter(function (b) { return str(b.title); });
    if (info && blocks.length) {
      info.textContent = '';
      blocks.forEach(function (b) {
        var box = el('div', 'icard meet');
        box.appendChild(el('p', 'eyebrow', str(b.title)));
        arr(b.lines).forEach(function (l) {
          l = str(l); if (!l) return;
          var parts = l.split(/\s+[—–-]\s+/);
          var item = el('div', 'meet__item');
          if (parts.length < 2) { item.appendChild(el('p', 'meet__note', l)); box.appendChild(item); return; }
          var name = parts.shift(), rest = parts.join(' — '), place = '';
          var pm = rest.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
          if (pm) { rest = pm[1]; place = pm[2]; }
          item.appendChild(el('h3', 'meet__name', name));
          item.appendChild(el('p', 'meet__when', rest));
          if (place) { var pl = el('p', 'meet__place'); pl.appendChild(el('i', '', '장소')); pl.appendChild(document.createTextNode(place)); item.appendChild(pl); }
          box.appendChild(item);
        });
        info.appendChild(box);
      });
    }
  }

  /* 첫 화면 '교회 소식' 카드 3장은 각 목록의 맨 앞 항목을 보여줍니다 */
  function renderHomeNews(bul, gal, not) {
    function apply(kind, item, title) {
      var card = $('[data-home-news="' + kind + '"]');
      if (!card || !item || !str(item.image)) return;
      var fig = $('figure.photo', card);
      if (fig) { fig.setAttribute('data-photo', rawUrl(item.image)); }
      if (title) { var h = $('.h3', card); if (h) h.textContent = title; }
    }
    if (bul) { var b = arr(bul.items)[0]; apply('bulletin', b, b && str(b.title)); }
    if (gal) { apply('gallery', arr(gal.items)[0], ''); }
    if (not) { var n = arr(not.items)[0]; apply('board', n, n && str(n.title)); }
  }

  /* ---------------------------------------------------------
     설교 · 유튜브
     --------------------------------------------------------- */
  function setYt(btn, o) {
    if (!btn || !o) return;
    var id = ytId(o.video);
    var list = ytList(o.list);
    if (!id && !list) return;
    ['data-video', 'data-list', 'data-thumb', 'data-title', 'data-date'].forEach(function (a) { btn.removeAttribute(a); });
    if (id) btn.setAttribute('data-video', id);
    if (list) btn.setAttribute('data-list', list);
    if (str(o.title)) btn.setAttribute('data-title', str(o.title));
    if (str(o.date)) btn.setAttribute('data-date', str(o.date));
  }
  function renderSermons(d) {
    if (d.featured) { $$('[data-sermon="featured"]').forEach(function (b) { setYt(b, d.featured); }); }
    if (d.column) {
      $$('[data-sermon="column"]').forEach(function (b) { setYt(b, d.column); });
      var lid = ytList(d.column.list);
      $$('[data-column-link]').forEach(function (a) { if (lid) a.href = 'https://www.youtube.com/playlist?list=' + lid; });
    }
    var host = $('[data-sermons-recent]');
    var recent = arr(d.recent).filter(function (r) { return ytId(r.video); });
    if (host && recent.length) {
      host.textContent = '';
      recent.slice(0, 18).forEach(function (r, i) {
        var card = el('article', 'card reveal');
        var dl = delay(i); if (dl) card.setAttribute('data-d', dl);
        var btn = el('button', 'yt'); btn.type = 'button'; btn.style.borderRadius = '0';
        btn.setAttribute('data-video', ytId(r.video));
        btn.setAttribute('data-title', str(r.title));
        card.appendChild(btn);
        var body = el('div', 'card__body');
        if (str(r.tag)) body.appendChild(el('span', 'card__tag', str(r.tag)));
        body.appendChild(el('h3', 'h3', str(r.title)));
        if (str(r.note)) body.appendChild(el('p', 'muted small', str(r.note)));
        card.appendChild(body);
        host.appendChild(card);
      });
    }
    var lists = arr(d.playlists).filter(function (p) { return ytList(p.id); });
    $$('[data-playlists]').forEach(function (grid) {
      if (!lists.length) return;
      var limit = parseInt(grid.getAttribute('data-limit'), 10) || 24;
      grid.textContent = '';
      lists.slice(0, limit).forEach(function (p, i) {
        var a = el('a', 'pl reveal');
        var dl = delay(i); if (dl) a.setAttribute('data-d', dl);
        a.href = 'https://www.youtube.com/playlist?list=' + ytList(p.id);
        a.target = '_blank'; a.rel = 'noopener';
        var th = el('span', 'pl__thumb');
        var tid = ytId(p.thumb);
        if (tid) {
          var img = document.createElement('img');
          img.src = 'https://i.ytimg.com/vi/' + tid + '/hqdefault.jpg'; img.alt = ''; img.loading = 'lazy';
          th.appendChild(img);
        }
        a.appendChild(th);
        a.appendChild(el('span', 'pl__name', str(p.title)));
        a.appendChild(el('span', 'pl__meta', (str(p.note) ? str(p.note) + ' · ' : '') + '재생목록 열기 ↗'));
        grid.appendChild(a);
      });
    });
  }

  /* ---------------------------------------------------------
     사진 크게 보기 (누르면 화면 가득)
     --------------------------------------------------------- */
  function eval_ratio(s) { var p = String(s).split('/'); var a = parseFloat(p[0]), c = parseFloat(p[1] || 1); return c ? a / c : 1; }
  function initLightbox() {
    var box = null;
    function close() { if (box) { box.remove(); box = null; document.body.style.overflow = ''; } }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.zoomimg');
      if (!b) return;
      e.preventDefault();
      close();
      box = el('div', 'lightbox');
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
      var img = document.createElement('img');
      img.alt = ''; img.src = b.getAttribute('data-full') || b.getAttribute('data-raw');
      img.onerror = function () { var raw = b.getAttribute('data-raw'); if (raw && img.src.indexOf(raw) === -1) img.src = raw; };
      var x = el('button', 'lightbox__x', '닫기 ✕'); x.type = 'button';
      var ratio = b.getAttribute('data-ratio');
      if (ratio) {
        var crop = el('div', 'lightbox__crop'); crop.style.aspectRatio = ratio; crop.style.setProperty('--r', String(eval_ratio(ratio)));
        crop.appendChild(img); box.appendChild(crop);
      } else { box.appendChild(img); }
      box.appendChild(x);
      box.appendChild(el('p', 'lightbox__hint', '두 손가락으로 벌리면 크게 볼 수 있어요'));
      box.addEventListener('click', close);
      document.body.appendChild(box);
      document.body.style.overflow = 'hidden';
      x.focus();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---------------------------------------------------------
     한꺼번에 불러와서 그리기
     --------------------------------------------------------- */
  function apply() {
    var need = {};
    if ($('[data-worship]')) need.worship = 1;
    if ($('.people-slider')) need.people = 1;
    if ($('[data-bulletin]') || $('[data-home-news="bulletin"]')) need.bulletin = 1;
    if ($('[data-gallery]') || $('[data-home-news="gallery"]')) need.gallery = 1;
    if ($('[data-notices]') || $('[data-info]') || $('[data-home-news="board"]')) need.notices = 1;
    if ($('[data-sermon]') || $('[data-sermons-recent]') || $('[data-playlists]')) need.sermons = 1;

    var names = Object.keys(need);
    var got = {};
    return Promise.all(names.map(function (n) {
      return getJSON(n).then(function (d) { got[n] = d; }, function () { /* 못 읽으면 원래 내용 유지 */ });
    })).then(function () {
      if (window.RC && window.RC.cancelled) return;   /* 너무 늦어서 이미 페이지가 시작됐다면 건드리지 않음 */
      var guard = function (fn, d) { try { if (d) fn(d); } catch (err) { if (window.console) console.warn('[content]', err); } };
      guard(renderWorship, got.worship);
      guard(renderPeople, got.people);
      guard(renderBulletin, got.bulletin);
      guard(renderGallery, got.gallery);
      guard(renderNotices, got.notices);
      guard(renderSermons, got.sermons);
      try { renderHomeNews(got.bulletin, got.gallery, got.notices); } catch (err) { /* 무시 */ }
    });
  }

  initLightbox();
  window.RC = { apply: apply, imgUrl: imgUrl };
})();
