/* ==========================================================================
   Сияника — анимация, вариант C «Живой». Пара к motion-c.css.
   Подключать в конце <body>. Первый экран (видео) не трогает.
   Что делает:
     1. Появление блоков по очереди при прокрутке (+ линия шагов).
     2. Счётчики в «Нам доверяют» отсчитываются от нуля.
     3. Фото «О компании» — параллакс внутри рамки.
     4. Карточки услуг — разная скорость при прокрутке, наклон и подсветка за курсором.
     5. Тёмный блок — пятна за прокруткой, световое пятно и «магнитная» кнопка за курсором.
     6. Бегущая строка ускоряется и наклоняется при быстрой прокрутке.
   При «уменьшить движение» в системе включает только статичную разметку.
   ========================================================================== */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('m-c');
  if (reduce) return;

  // Доработанная версия (v2) — по умолчанию: свой характер появления у секций, сквозная линия-блик,
  // меньший разброс карточек. Прежний вариант C: ?motion=c в адресе или data-motion="c" на <html>.
  var v2 = !/(?:^|[?&])motion=c(?:&|$)/.test(location.search) && root.dataset.motion !== 'c';
  if (v2) root.classList.add('m-c2');

  /* ---------- 1. Появление по очереди ---------- */
  // Что появляется: шапки секций, карточки, тарифы, шаги, FAQ, фото, блок цифр.
  var GROUPS = [
    '.section-head > *', '.grid-3 > *', '.grid-4 > *', '.steps-row > .step',
    '.faq-list > details', '.about-grid > *', '.proof', '.contacts-grid > *',
    '.booking .container > :not(.btn)'
  ];
  // На настоящем сайте у блоков уже есть своё появление (.reveal → .visible) —
  // тогда своё не включаем, чтобы не было двойной анимации.
  var siteMode = !!document.querySelector('.reveal');
  if (!siteMode) root.classList.add('m-own');
  var sections = document.querySelectorAll('main section, body > section');
  sections.forEach(function (sec) {
    if (siteMode || sec.id === 'hero') return;
    var i = 0;
    sec.querySelectorAll(GROUPS.join(',')).forEach(function (el) {
      if (el.closest('.rv')) return;
      el.classList.add('rv');
      el.style.setProperty('--d', (Math.min(i++, 8) * 0.1) + 's');
    });
  });

  /* ---------- 2. Счётчики ---------- */
  function count(el) {
    var raw = el.textContent.trim();
    var m = raw.match(/^([\d\s .,]+)(.*)$/);
    if (!m) return;
    var numStr = m[1].replace(/[\s ]/g, '').replace(',', '.');
    var to = parseFloat(numStr), suf = m[2], dec = (numStr.split('.')[1] || '').length;
    var fmt = function (n) { return n.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + suf; };
    var t0 = null, dur = 1400;
    el.textContent = fmt(0);
    requestAnimationFrame(function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    });
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      en.target.querySelectorAll('.stat-val, .stat-num').forEach(count);
      io.unobserve(en.target);
    });
  }, { threshold: 0.2 });
  sections.forEach(function (s) { if (s.id !== 'hero') io.observe(s); });

  /* ---------- 4. Карточки услуг: наклон и подсветка ---------- */
  var cards = Array.prototype.slice.call(document.querySelectorAll('#services .service-card:not(.service-card--flip)'));
  // Карточки-перевёртыши с видео уже вращаются сами — их не наклоняем.
  cards.forEach(function (c) { c.classList.add('m-tilt'); });
  if (fine) {
    cards.forEach(function (c) {
      c.addEventListener('mousemove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', ((x - .5) * 22).toFixed(2) + 'deg');
        c.style.setProperty('--rx', ((.5 - y) * 22).toFixed(2) + 'deg');
        c.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        c.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      c.addEventListener('mouseleave', function () { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); });
    });
  }

  /* ---------- 5. Тёмный блок ---------- */
  var booking = document.querySelector('.booking');
  if (booking) {
    var spot = document.createElement('span');
    spot.className = 'm-spot'; spot.setAttribute('aria-hidden', 'true');
    booking.insertBefore(spot, booking.firstChild);
    var mag = booking.querySelector('.btn');
    if (mag) mag.classList.add('m-mag');
    if (fine) {
      booking.addEventListener('mousemove', function (e) {
        var r = booking.getBoundingClientRect();
        booking.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        booking.style.setProperty('--my', (e.clientY - r.top) + 'px');
        if (!mag) return;
        var br = mag.getBoundingClientRect();
        var dx = e.clientX - (br.left + br.width / 2), dy = e.clientY - (br.top + br.height / 2);
        mag.style.transform = Math.hypot(dx, dy) < 220 ? 'translate(' + (dx * .3).toFixed(1) + 'px,' + (dy * .4).toFixed(1) + 'px)' : '';
      });
      booking.addEventListener('mouseleave', function () { if (mag) mag.style.transform = ''; });
    }
  }

  /* ---------- 7. «Бизнесу» наезжает на «О компании» ----------
     «О компании» залипает на месте, следующая секция поднимается поверх и полностью её закрывает.
     Обе секции оборачиваются в общий блок: залипание действует только в его пределах,
     дальше страница прокручивается как обычно. */
  // Та же схема для «Цены» поверх «Услуг».
  var stacks = [];
  function makeStack(under, over) {
    if (!under || !over || under.nextElementSibling !== over) return;
    var wrap = document.createElement('div');
    wrap.className = 'm-stack';
    under.parentNode.insertBefore(wrap, under);
    wrap.appendChild(under);
    wrap.appendChild(over);
    var dim = document.createElement('span');
    dim.className = 'm-dim';
    dim.setAttribute('aria-hidden', 'true');
    under.appendChild(dim);
    // Если секция выше экрана, залипаем, когда её низ дошёл до низа экрана
    var setStick = function () { under.style.setProperty('--stick-top', Math.min(0, innerHeight - under.offsetHeight) + 'px'); };
    setStick();
    window.addEventListener('resize', setStick);
    stacks.push({ under: under, over: over });
  }
  makeStack(document.getElementById('about'), document.getElementById('business'));
  makeStack(document.getElementById('services'), document.getElementById('prices'));

  /* ---------- 8. Цены: набегают, фокус и подсветка, рамка у выделенной, маркер под оптом, бейджи ---------- */
  var prices = document.getElementById('prices');
  if (prices) {
    prices.classList.add('pm-on');
    var fmtNum = function (v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
    var priceCounters = [];
    prices.querySelectorAll('.price-val').forEach(function (el) {
      var m = el.textContent.replace(/ /g, ' ').match(/^(\D*?)(\d[\d ]*\d|\d)(.*)$/);
      if (!m) return;
      var to = parseInt(m[2].replace(/ /g, ''), 10);
      el.textContent = '';
      el.appendChild(document.createTextNode(m[1].replace(/ /g, ' ')));
      var n = document.createElement('span');
      n.className = 'pm-num';
      n.textContent = fmtNum(to);
      el.appendChild(n);
      el.appendChild(document.createTextNode(m[3].replace(/ /g, ' ')));
      priceCounters.push({ el: n, to: to });
    });
    prices.querySelectorAll('.price-card').forEach(function (card) {
      var spot = document.createElement('span');
      spot.className = 'pm-spot';
      spot.setAttribute('aria-hidden', 'true');
      card.appendChild(spot);
      if (card.classList.contains('featured')) {
        var ring = document.createElement('span');
        ring.className = 'pm-ring';
        ring.setAttribute('aria-hidden', 'true');
        card.appendChild(ring);
      }
      if (fine) {
        card.addEventListener('mousemove', function (e) {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      }
    });
    var pio = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      prices.classList.add('pm-in');
      priceCounters.forEach(function (c, i) {
        var t0 = null;
        c.el.textContent = fmtNum(0);
        setTimeout(function () {
          requestAnimationFrame(function step(t) {
            if (!t0) t0 = t;
            var p = Math.min((t - t0) / 1200, 1);
            c.el.textContent = fmtNum(c.to * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
          });
        }, 150 + i * 120);
      });
      pio.disconnect();
    }, { threshold: 0.3 });
    pio.observe(prices);
  }

  /* ---------- 3, 4, 5, 6: всё, что зависит от прокрутки, — в одном кадре ---------- */
  var photo = document.querySelector('.about-img');
  var track = document.querySelector('.marquee-track');
  var grid = cards.length ? cards[0].parentElement : null;
  var blobs = booking ? Array.prototype.slice.call(booking.querySelectorAll('.booking-blob')) : [];
  var SPEEDS = v2 ? [12, 30, 20, 38] : [60, 140, 90, 170];

  // Сквозная линия-блик: от первого экрана до низа страницы, заполняется по прокрутке
  var thread = null, hero = document.getElementById('hero');
  if (v2) {
    thread = document.createElement('div');
    thread.className = 'm-thread';
    thread.setAttribute('aria-hidden', 'true');
    thread.appendChild(document.createElement('i'));
    thread.appendChild(document.createElement('b'));
    document.body.appendChild(thread);
  }
  var mx = 0, speed = 0.5, lastY = window.scrollY;

  // Позиция элемента относительно центра экрана: -1 … 1
  function rel(el) { var r = el.getBoundingClientRect(); return (r.top + r.height / 2 - innerHeight / 2) / innerHeight; }

  function frame() {
    var y = window.scrollY, dy = y - lastY; lastY = y;

    if (thread) {
      var start = hero ? hero.offsetHeight * 0.6 : 0;
      var max = document.documentElement.scrollHeight - innerHeight;
      var pr = Math.max(0, Math.min(1, (y - start) / Math.max(1, max - start)));
      thread.style.setProperty('--p', pr.toFixed(4));
      thread.classList.toggle('on', y > start);
    }

    // Насколько верхняя секция уже закрыла нижнюю: 0 — только показалась снизу, 1 — дошла до верха
    stacks.forEach(function (st) {
      var ct = st.over.getBoundingClientRect().top;
      st.under.style.setProperty('--cover', Math.max(0, Math.min(1, 1 - ct / innerHeight)).toFixed(3));
    });

    if (track) {
      var target = 0.5 + Math.min(Math.abs(dy) * 0.5, 14);
      speed += (target - speed) * 0.1;
      mx -= speed;
      var half = track.scrollWidth / 2;
      if (-mx > half) mx += half;
      var skew = Math.max(-12, Math.min(12, -dy * 0.4));
      track.style.transform = 'translateX(' + mx.toFixed(1) + 'px) skewX(' + skew.toFixed(1) + 'deg)';
    }
    if (photo) {
      var k = Math.max(-1, Math.min(1, rel(photo)));
      photo.style.setProperty('--px', (-13 - k * 11).toFixed(2) + '%');
    }
    if (grid) {
      var g = Math.max(-1, Math.min(1, rel(grid)));
      // Скорость зависит от колонки карточки в сетке, а не от номера среди наклоняемых
      cards.forEach(function (c) {
        var col = Array.prototype.indexOf.call(grid.children, c) % 4;
        c.style.setProperty('--py', (g * SPEEDS[col]).toFixed(1) + 'px');
      });
    }
    if (booking) {
      var b = Math.max(-1, Math.min(1, rel(booking)));
      booking.style.setProperty('--b1x', (b * -60).toFixed(1) + 'px');
      booking.style.setProperty('--b1y', (b * 40).toFixed(1) + 'px');
      booking.style.setProperty('--b2x', (b * 60).toFixed(1) + 'px');
      booking.style.setProperty('--b2y', (b * -40).toFixed(1) + 'px');
      // На сайте пятна — отдельные элементы .booking-blob со своей анимацией;
      // свойство translate складывается с ней, не ломая её.
      blobs.forEach(function (el, i) {
        var s = i % 2 ? 1 : -1;
        el.style.translate = (b * 70 * s).toFixed(1) + 'px ' + (b * -50 * s).toFixed(1) + 'px';
      });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
