/* ============================================================
   로뎀나무교회 홈페이지 — 동작 스크립트
   순수 자바스크립트, 외부 라이브러리 없음
   ============================================================ */
(function () {
  'use strict';

  var ready = function (fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  /* ---------------------------------------------------------
     1) 헤더 — 스크롤하면 흰 배경으로 전환
     --------------------------------------------------------- */
  function initHeader() {
    var header = document.querySelector('.header');
    if (!header) return;
    var hasHero = !!document.querySelector('.hero, .page-hero');
    var onScroll = function () {
      var past = window.scrollY > (hasHero ? 80 : 10);
      header.classList.toggle('header--solid', past || !hasHero);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------
     2) 모바일 메뉴
     --------------------------------------------------------- */
  function initNav() {
    var btn = document.querySelector('.nav-toggle');
    var gnb = document.querySelector('.gnb');
    if (!btn || !gnb) return;

    var close = function () {
      document.body.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    };

    btn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    gnb.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) close();
    });

    /* 현재 페이지 메뉴 표시 */
    var here = location.pathname.split('/').pop() || 'index.html';
    Array.prototype.forEach.call(gnb.querySelectorAll('a'), function (a) {
      var href = (a.getAttribute('href') || '').split('#')[0].split('/').pop();
      if (href && href === here) {
        var top = a.closest('.gnb > li');
        if (top) top.classList.add('is-current');
      }
    });
  }

  /* ---------------------------------------------------------
     3) 사진 자리 — 파일이 있으면 사진, 없으면 첨부 안내 박스
        <figure class="photo"
                data-photo="assets/img/파일명.jpg"
                data-label="어떤 사진인지"
                data-size="권장 크기"></figure>
     --------------------------------------------------------- */
  var CAMERA_ICON =
    '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>' +
    '<circle cx="12" cy="13" r="4"/></svg>';

  /* 확장자를 정확히 안 맞춰도 되도록, 자주 쓰는 사진 형식을 순서대로 찾아봅니다.
     (파일 이름의 앞부분만 정확히 맞으면 .jpg .JPG .jpeg .png .webp 무엇이든 인식됩니다) */
  var PHOTO_EXTS = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG', 'webp', 'WEBP', 'svg'];

  function initPhotos() {
    Array.prototype.forEach.call(document.querySelectorAll('.photo[data-photo]'), function (fig) {
      var src = fig.getAttribute('data-photo');
      var label = fig.getAttribute('data-label') || '사진을 넣어 주세요';
      var size = fig.getAttribute('data-size') || '';
      var alt = fig.getAttribute('data-alt') || label;

      var dot = src.lastIndexOf('.');
      var base = dot > -1 ? src.slice(0, dot) : src;

      var candidates = [src];
      PHOTO_EXTS.forEach(function (ext) {
        var candidate = base + '.' + ext;
        if (candidates.indexOf(candidate) === -1) candidates.push(candidate);
      });

      var showSlot = function () {
        fig.classList.add('is-missing');
        fig.innerHTML =
          '<div class="photo__slot">' + CAMERA_ICON +
          '<b>' + label + '</b>' +
          '<code>' + src + '</code>' +
          (size ? '<small>' + size + '</small>' : '') +
          '</div>';
      };

      /* 관리 화면으로 올린 사진은 알맞은 크기로 줄여 주는 주소를 먼저 쓰고, 안 되면 원본을 씁니다 */
      var sized = function (p) {
        var w = fig.hasAttribute('data-eager') ? 1920 : 1000;
        return (window.RC && window.RC.imgUrl) ? window.RC.imgUrl(p, w) : p;
      };

      var showImage = function (foundSrc, rawSrc) {
        var img = document.createElement('img');
        img.src = foundSrc;
        img.alt = alt;
        img.loading = fig.hasAttribute('data-eager') ? 'eager' : 'lazy';
        img.decoding = 'async';
        if (rawSrc && rawSrc !== foundSrc) {
          img.onerror = function () { img.onerror = null; img.src = rawSrc; };
        }
        fig.innerHTML = '';
        fig.appendChild(img);
      };

      var tryNext = function (i) {
        if (i >= candidates.length) { showSlot(); return; }
        var raw = candidates[i], url = sized(raw);
        var probe = new Image();
        probe.onload = function () { showImage(url, raw); };
        probe.onerror = function () {
          if (url !== raw) {
            var again = new Image();
            again.onload = function () { showImage(raw, raw); };
            again.onerror = function () { tryNext(i + 1); };
            again.src = raw;
          } else { tryNext(i + 1); }
        };
        probe.src = url;
      };

      tryNext(0);
    });
  }

  /* ---------------------------------------------------------
     4) 유튜브 — 클릭할 때만 영상을 불러옵니다(첫 화면이 빨라집니다)
        <button class="yt" data-video="영상ID"> 또는 data-list="재생목록ID"
     --------------------------------------------------------- */
  var PLAY_ICON =
    '<span class="yt__play" aria-hidden="true">' +
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
    '</span>';

  function initYouTube() {
    Array.prototype.forEach.call(document.querySelectorAll('.yt'), function (box) {
      var video = box.getAttribute('data-video');
      var list = box.getAttribute('data-list');
      var thumbId = box.getAttribute('data-thumb') || video;
      var title = box.getAttribute('data-title') || '';
      var date = box.getAttribute('data-date') || '';

      if (thumbId) {
        var img = document.createElement('img');
        img.src = 'https://i.ytimg.com/vi/' + thumbId + '/maxresdefault.jpg';
        img.alt = title || '유튜브 영상 미리보기';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.onerror = function () {
          img.onerror = null;
          img.src = 'https://i.ytimg.com/vi/' + thumbId + '/hqdefault.jpg';
        };
        box.appendChild(img);
      }
      box.insertAdjacentHTML('beforeend', PLAY_ICON);
      if (title) {
        box.insertAdjacentHTML(
          'beforeend',
          '<span class="yt__cap"><b>' + title + '</b>' + (date ? '<span>' + date + '</span>' : '') + '</span>'
        );
      }
      if (!box.getAttribute('aria-label')) {
        box.setAttribute('aria-label', (title || '유튜브 영상') + ' 재생');
      }

      box.addEventListener('click', function () {
        if (box.querySelector('iframe')) return;
        var src = 'https://www.youtube-nocookie.com/embed/';
        if (video) src += video + '?autoplay=1&rel=0' + (list ? '&list=' + list : '');
        else src += 'videoseries?autoplay=1&rel=0&list=' + list;

        var frame = document.createElement('iframe');
        frame.src = src;
        frame.title = title || '로뎀나무교회 유튜브 영상';
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        frame.allowFullscreen = true;
        box.innerHTML = '';
        box.appendChild(frame);
      });
    });
  }

  /* ---------------------------------------------------------
     5) 스크롤 등장 애니메이션
     --------------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     6) 페이지 안 탭(서브내비) — 현재 보고 있는 섹션 표시
     --------------------------------------------------------- */
  function initSubnav() {
    var nav = document.querySelector('.subnav');
    if (!nav) return;
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);
    if (!sections.length) return;

    var sync = function () {
      var line = window.scrollY + (document.querySelector('.header').offsetHeight + nav.offsetHeight + 24);
      var current = sections[0];
      sections.forEach(function (s) { if (s.offsetTop <= line) current = s; });
      links.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + current.id);
      });
    };
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
  }

  /* ---------------------------------------------------------
     7) 올해 연도 자동 표시
     --------------------------------------------------------- */
  function initYear() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---------------------------------------------------------
     7-2) 섬기는 사람들 — 가로 슬라이드(캐러셀)
          · 담임목사부터 12명이 하나의 띠로 이어져 옆으로 계속 돕니다
          · PC는 여러 명, 휴대폰은 한 명씩 / 화살표·점·밀어서 넘기기·자동 넘김
          · about.html 의 people-slider 클래스를 지우면 이 기능은 꺼집니다
     --------------------------------------------------------- */
  function initPeopleSlider() {
    var section = document.querySelector('.people-slider');
    if (!section) return;
    var host = section.querySelector('.container');
    var persons = Array.prototype.slice.call(section.querySelectorAll('.person'));
    if (!host || persons.length < 2) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var N = persons.length;
    var CL = Math.min(4, N);            /* 양쪽 끝에 붙이는 복제 카드 수 (끊김 없이 이어지게) */
    var mk = function (tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; };

    /* 1) 이름·직분·담당을 묶어 사진 위에 얹을 수 있게 하고, 기존 그룹 칸에서 꺼냅니다 */
    persons.forEach(function (p) {
      var cap = mk('div', 'person__cap');
      Array.prototype.slice.call(p.children).forEach(function (el) {
        if (!el.classList.contains('photo')) cap.appendChild(el);
      });
      p.appendChild(cap);
      p.classList.remove('reveal');
      p.removeAttribute('data-d');
      if (p.parentNode) p.parentNode.removeChild(p);
    });
    Array.prototype.slice.call(host.children).forEach(function (ch) {
      if (ch.tagName === 'H3' || ch.classList.contains('grid')) host.removeChild(ch);
    });

    /* 2) 캐러셀 뼈대 */
    var pcar = mk('div', 'pcar reveal');
    pcar.setAttribute('role', 'region');
    pcar.setAttribute('aria-roledescription', 'carousel');
    pcar.setAttribute('aria-label', '섬기는 사람들');
    var stage = mk('div', 'pcar__stage');
    var viewport = mk('div', 'pcar__viewport');
    viewport.tabIndex = 0;
    viewport.setAttribute('aria-label', '좌우로 넘겨서 섬기는 사람들을 볼 수 있습니다');
    var track = mk('div', 'pcar__track');

    var cloneOf = function (p) {
      var c = p.cloneNode(true);
      c.classList.add('is-clone');
      c.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(c.querySelectorAll('a'), function (a) { a.tabIndex = -1; });
      return c;
    };
    var i;
    for (i = N - CL; i < N; i++) track.appendChild(cloneOf(persons[i]));
    persons.forEach(function (p) { track.appendChild(p); });
    for (i = 0; i < CL; i++) track.appendChild(cloneOf(persons[i]));

    var chevron = function (dir) {
      return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '"/></svg>';
    };
    var prev = mk('button', 'pcar__btn pcar__prev'); prev.type = 'button'; prev.setAttribute('aria-label', '이전 사람'); prev.innerHTML = chevron(-1);
    var next = mk('button', 'pcar__btn pcar__next'); next.type = 'button'; next.setAttribute('aria-label', '다음 사람'); next.innerHTML = chevron(1);
    var dots = mk('div', 'pcar__dots');
    var dotEls = [];
    persons.forEach(function (p, k) {
      var d = mk('button'); d.type = 'button';
      var nm = p.querySelector('.person__name');
      d.setAttribute('aria-label', (k + 1) + '번째: ' + (nm ? nm.textContent.trim() : ''));
      dots.appendChild(d); dotEls.push(d);
    });

    viewport.appendChild(track);
    stage.appendChild(viewport); stage.appendChild(prev); stage.appendChild(next);
    pcar.appendChild(stage); pcar.appendChild(dots);
    host.appendChild(pcar);
    section.classList.add('has-pcar');

    /* 3) 위치 계산 */
    var idx = 0, pv = 4, cw = 0, busy = false, normTimer = 0;
    var maxStep = function () { return Math.max(1, CL - pv + 1); };
    /* PC(3명씩 보일 때)만: 가운데 사람이 잠깐 크게 나오도록 표시 */
    var cards = Array.prototype.slice.call(track.children);
    var markCenter = function () {
      var c = idx + CL + (pv === 3 ? 1 : -1);
      cards.forEach(function (el, k) { el.classList.toggle('is-center', k === c); });
    };
    var place = function (anim, dx) {
      track.classList.toggle('no-anim', !anim);
      markCenter();
      track.style.transform = 'translate3d(' + (-(idx + CL) * cw + (dx || 0)) + 'px,0,0)';
    };
    /* 지금 '주인공'(PC는 가운데, 그 밖에는 맨 앞) 사람의 번호 */
    var curIdx = function () { return (((idx + (pv === 3 ? 1 : 0)) % N) + N) % N; };
    var started = false;
    var updateDots = function () {
      var cur = curIdx();
      dotEls.forEach(function (d, k) { d.classList.toggle('on', k === cur); });
    };
    var layout = function () {
      var w = window.innerWidth;
      pv = w > 900 ? 3 : w > 700 ? 2 : 1;
      section.style.setProperty('--pv', pv);
      cw = viewport.clientWidth / pv;
      if (!started) { started = true; if (pv === 3) idx = -1; }   /* PC: 첫 사람(담임목사)이 가운데에서 시작 */
      place(false);
      updateDots();
    };
    var normalize = function () {
      window.clearTimeout(normTimer);
      if (idx >= N) idx -= N; else if (idx < 0) idx += N;
      place(false);
      busy = false;
      updateDots();
    };
    var move = function (steps) {
      if (busy || !cw || !steps) return;
      busy = true;
      idx += steps;
      place(true);
      updateDots();
      normTimer = window.setTimeout(normalize, 780);
    };
    track.addEventListener('transitionend', function (e) {
      if (e.target === track && e.propertyName === 'transform') normalize();
    });

    /* 4) 자동 넘김과 일시 멈춤 */
    var pausedUntil = 0, visible = false, hover = false, dragging = false;
    var pause = function (ms) { pausedUntil = Date.now() + (ms || 8000); };

    prev.addEventListener('click', function () { pause(); move(-1); });
    next.addEventListener('click', function () { pause(); move(1); });
    dotEls.forEach(function (d, k) {
      d.addEventListener('click', function () {
        pause();
        var cur = curIdx(), diff = k - cur;
        if (diff > N / 2) diff -= N; else if (diff < -N / 2) diff += N;
        if (Math.abs(diff) <= maxStep()) { move(diff); }
        else { idx = k - (pv === 3 ? 1 : 0); place(false); updateDots(); }
      });
    });
    viewport.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { pause(); move(-1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { pause(); move(1); e.preventDefault(); }
    });
    /* 마우스일 때만 '올려 두면 멈춤' (터치 화면에서는 탭 후에도 멈추지 않도록) */
    viewport.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    viewport.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hover = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }, { threshold: 0.35 }).observe(pcar);
    } else { visible = true; }
    if (!reduce) {
      /* PC 3초, 휴대폰(한 명씩 화면 가득) 2초 간격 */
      var gap = function () { return window.innerWidth <= 700 ? 2000 : 3000; };
      var tick = function () {
        window.setTimeout(tick, gap());
        if (!visible || hover || dragging || busy || document.hidden || Date.now() < pausedUntil) return;
        move(1);
      };
      window.setTimeout(tick, gap());
    }

    /* 5) 손가락·마우스로 밀어서 넘기기 */
    var startX = 0, dx = 0, moved = false;
    viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });
    viewport.addEventListener('pointerdown', function (e) {
      if (busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
      dragging = true; moved = false; startX = e.clientX; dx = 0;
      try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
      viewport.classList.add('is-drag');
      pause(window.innerWidth <= 700 ? 3500 : 9000);
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      place(false, dx);
    });
    var endDrag = function () {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('is-drag');
      var steps = Math.round(-dx / cw);
      if (steps === 0 && Math.abs(dx) > cw * 0.16) steps = dx < 0 ? 1 : -1;
      var lim = maxStep();
      steps = Math.max(-lim, Math.min(lim, steps));
      dx = 0;
      if (steps) { busy = true; idx += steps; place(true); updateDots(); normTimer = window.setTimeout(normalize, 780); }
      else { place(true); }
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);

    var timer = 0;
    window.addEventListener('resize', function () { window.clearTimeout(timer); timer = window.setTimeout(layout, 120); });
    window.addEventListener('load', layout);
    layout();
  }
  /* 관리 화면에서 고친 내용(content/*.json)을 먼저 읽어 화면에 넣은 뒤, 나머지 기능을 시작합니다.
     내용 파일을 못 읽어도(또는 content.js 가 없어도) 페이지에 원래 들어 있던 내용으로 정상 동작합니다. */
  /* 주소 뒤의 #항목(예: about.html#worship)으로 들어왔을 때, 내용·사진이 늦게 채워져 페이지 높이가 바뀌어도
     정확한 자리로 다시 맞춥니다 (사용자가 직접 스크롤하기 전까지만) */
  /* 휴대폰: 탭을 누르면 그 섹션의 내용(섬기는 사람들은 사진)이 고정 머리글·탭 바로 아래에 딱 맞게 옵니다 */
  function mobileTabY(sec) {
    var hd = document.querySelector('.header'), nav = document.querySelector('.subnav');
    var bars = (hd ? hd.offsetHeight : 0) + (nav ? nav.offsetHeight : 0);
    /* 등장 애니메이션(살짝 아래에서 올라옴)의 영향을 받지 않도록, 화면 좌표 대신 문서 안의 실제 위치를 잽니다 */
    var absTop = function (el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; };
    var pc = sec.querySelector('.pcar');
    if (pc) return Math.max(0, absTop(pc) - bars);
    var pad = parseFloat(getComputedStyle(sec).paddingTop) || 0;
    return Math.max(0, absTop(sec) + Math.min(pad, 72) - bars - 8);
  }
  function initMobileTabs() {
    var nav = document.querySelector('.subnav');
    if (!nav) return;
    Array.prototype.forEach.call(nav.querySelectorAll('a[href^="#"]'), function (a) {
      a.addEventListener('click', function (e) {
        if (window.innerWidth > 700) return;
        var sec = document.querySelector(a.getAttribute('href'));
        if (!sec) return;
        e.preventDefault();
        window.scrollTo({ top: mobileTabY(sec), behavior: 'smooth' });
        /* 사진이 늦게 뜨며 높이가 바뀌어도 한 번 더 정확히 맞춥니다 */
        window.setTimeout(function () { window.scrollTo({ top: mobileTabY(sec), behavior: 'auto' }); }, 650);
        try { history.replaceState(null, '', a.getAttribute('href')); } catch (err) { /* 무시 */ }
      });
    });
  }
  function initAnchorFix() {
    var h = window.location.hash;
    if (!h || h.length < 2) return;
    var target = null;
    try { target = document.getElementById(decodeURIComponent(h.slice(1))); } catch (e) { return; }
    if (!target) return;
    var moved = false;
    var mark = function () { moved = true; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) { window.addEventListener(ev, mark, { passive: true, once: true }); });
    var jump = function () {
      if (moved) return;
      if (window.innerWidth <= 700 && document.querySelector('.subnav')) window.scrollTo({ top: mobileTabY(target), behavior: 'auto' });
      else target.scrollIntoView({ block: 'start', behavior: 'instant' });
    };
    jump();
    window.addEventListener('load', function () { window.setTimeout(jump, 200); window.setTimeout(jump, 900); });
  }
  ready(function () {
    var start = function () {
      initPeopleSlider();
      initHeader();
      initNav();
      initPhotos();
      initYouTube();
      initReveal();
      initSubnav();
      initMobileTabs();
      initYear();
      initAnchorFix();
    };
    var started = false;
    var go = function () { if (started) return; started = true; start(); };
    if (window.RC && window.RC.apply) {
      /* 아주 느린 연결에서도 화면이 멈춰 보이지 않도록 최대 2.5초만 기다립니다 */
      var t = window.setTimeout(function () { window.RC.cancelled = true; go(); }, 2500);
      window.RC.apply().then(function () { window.clearTimeout(t); go(); }, function () { window.clearTimeout(t); go(); });
    } else {
      go();
    }
  });
})();
