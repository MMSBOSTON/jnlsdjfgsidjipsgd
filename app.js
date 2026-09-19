/* ==========================================================
   MAJESTIC — app.js (роутер + главная + гайд)
   ========================================================== */
(function(){
  'use strict';

  var $  = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
  };

  /* ---------- CURSOR ---------- */
  function initCursor(){
    if (window.matchMedia('(max-width:860px)').matches) return;
    var dot  = $('#cursorDot');
    var ring = $('#cursorRing');
    var glow = $('#bgGlow');
    if (!dot || !ring) return;

    var mx = innerWidth / 2, my = innerHeight / 2;
    var rx = mx, ry = my;

    window.addEventListener('mousemove', function(e){
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px, ' + my + 'px) translate(-50%,-50%)';
      if (glow){
        glow.style.setProperty('--mx', mx + 'px');
        glow.style.setProperty('--my', my + 'px');
      }
    });

    (function loop(){
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px, ' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();

    document.addEventListener('mouseover', function(e){
      var t = e.target.closest('a, button, .featured-card, .step');
      document.body.classList.toggle('is-hovering', !!t);
    });
  }

  /* ---------- RIPPLE ---------- */
  function bindRipples(){
    document.addEventListener('click', function(e){
      var btn = e.target.closest('.btn');
      if (!btn) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - r.left - size/2) + 'px';
      span.style.top  = (e.clientY - r.top  - size/2) + 'px';
      btn.appendChild(span);
      setTimeout(function(){ span.remove(); }, 620);
    });
  }

  /* ---------- COUNT UP ---------- */
  function countUp(el, target, ms){
    ms = ms || 900;
    var start = performance.now();
    function frame(now){
      var t = Math.min(1, (now - start) / ms);
      var e = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * e);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- VIEW: HOME ---------- */
  function viewHome(){
    return [
      '<div class="page">',
      '  <section class="hero">',
      '    <span class="eyebrow">GTA V / FiveM / Majestic RP</span>',
      '    <h1>Свой <em>конструктор</em><br>одежды для Majestic</h1>',
      '    <p class="hero-text">',
      '      Выбери тип одежды, нарисуй текстуру на холсте — кисти, заливка,',
      '      фигуры, текст, картинки, слои — и сразу увидь результат',
      '      на 3D-манекене. Затем скачай PNG или ZIP для установки в игру.',
      '    </p>',
      '    <div class="hero-actions">',
      '      <a href="#/editor" class="btn btn-primary btn-lg">Открыть конструктор</a>',
      '      <a href="#/guide"  class="btn btn-ghost btn-lg">Как установить в GTA</a>',
      '    </div>',
      '    <div class="hero-stats">',
      '      <div class="stat"><b data-count="8">0</b><span>типов одежды</span></div>',
      '      <div class="stat"><b data-count="8">0</b><span>инструментов</span></div>',
      '      <div class="stat"><b data-count="1024">0</b><span>размер текстуры</span></div>',
      '    </div>',
      '  </section>',
      '  <section class="featured">',
      '    <div class="section-head"><h2>Что внутри</h2><span class="section-line"></span></div>',
      '    <div class="featured-grid">',
      ['3D превью',  'Модель поворачивается, текстура обновляется в реальном времени'],
      ['Слои',       'Добавляй, скрывай, меняй прозрачность'],
      ['Кисти',      'Brush, заливка, фигуры, текст, свои картинки'],
      ['Undo/Redo',  'История на 15 шагов'],
      ['PNG',        'Скачивается в 1024×1024, готов для OpenIV'],
      ['ZIP',        'README + FixArchive.bat + папка textures'],
      ].map(function(x){
        return '<div class="featured-card"><h3>' + esc(x[0]) + '</h3><p>' + esc(x[1]) + '</p></div>';
      }).join(''),
      '    </div>',
      '  </section>',
      '</div>',
    ].join('');
  }

  function mountHome(){
    $$('[data-count]').forEach(function(el){
      countUp(el, +el.dataset.count, 1100);
    });
  }

  /* ---------- VIEW: GUIDE ---------- */
  function viewGuide(){
    var faq = [
      ['Можно ли скачать готовый .rpf?',
       'Нет. Подписать .rpf может только ArchiveFix — он берёт ключи из запущенной GTA 5. Сайт отдаёт PNG-текстуру и ZIP с инструкцией.'],
      ['Как поставить свою текстуру в игру?',
       'OpenIV → Edit mode → открываешь нужный dlc.rpf → находишь .ytd нужного слота (например <code>jbib_000_u.ytd</code>) → Import → выбираешь PNG из архива. OpenIV сам конвертирует.'],
      ['Какой слот выбрать?',
       'Футболка — <code>jbib_000_u</code>. Штаны — <code>lowr_000_u</code>. Кроссовки — <code>feet_000_u</code>. Кепка — <code>p_head_000</code>. Список слотов есть в правой панели экспорта.'],
      ['Куда кидать .rpf?',
       'Стандартный путь: <code>mods/update/x64/dlcpacks/&lt;любой-dlc&gt;/dlc.rpf</code>. Менять можно любой существующий dlc — главное чтобы в нём был нужный слот.'],
      ['Нужно ли что-то кроме OpenIV?',
       'Да, ArchiveFix. После любого изменения .rpf обязательно прогоняешь архив через ArchiveFix.exe (или FixArchive.bat из нашего ZIP). Без этого Majestic выдаст ошибку.'],
      ['А если хочу новый слот, а не замену?',
       'Тогда нужен grzyClothTool: <code>https://grzy.tools/</code>. Он создаёт новый dlc.rpf с новыми слотами. Наш конструктор генерирует текстуры — их можно вставить в паки от grzyClothTool.'],
    ];

    return [
      '<div class="page guide-page">',
      '  <h1>Как это работает</h1>',
      '  <p class="lead">От пустого холста до рабочей заменки на Majestic RP — четыре шага.</p>',
      '  <div class="steps">',
      '    <div class="step"><span class="step-num">01</span><h3>Тип одежды</h3>',
      '      <p>Выбери, что создаёшь — футболку, штаны, кепку. 3D-манекен обновится и покажет форму.</p></div>',
      '    <div class="step"><span class="step-num">02</span><h3>Рисуй</h3>',
      '      <p>Кисти, заливка, фигуры, текст, картинки. Слои, undo, прозрачность. Всё видно на 3D в реальном времени.</p></div>',
      '    <div class="step"><span class="step-num">03</span><h3>Скачай</h3>',
      '      <p>PNG-текстуру 1024×1024 или ZIP с README, батником и папкой textures.</p></div>',
      '    <div class="step"><span class="step-num">04</span><h3>Установи</h3>',
      '      <p>OpenIV → замена .ytd → сохранение → ArchiveFix. Готово.</p></div>',
      '  </div>',
      '  <div class="section-head"><h2>Частые вопросы</h2><span class="section-line"></span></div>',
      '  <div class="accordion" id="accordion">',
      faq.map(function(qa){
        return '<div class="acc-item">' +
          '<button class="acc-btn">' + esc(qa[0]) + '</button>' +
          '<div class="acc-body"><div class="acc-body-inner">' + qa[1] + '</div></div>' +
          '</div>';
      }).join(''),
      '  </div>',
      '</div>',
    ].join('');
  }

  function mountGuide(){
    var acc = $('#accordion');
    if (!acc) return;
    acc.addEventListener('click', function(e){
      var btn = e.target.closest('.acc-btn');
      if (!btn) return;
      var item = btn.parentElement;
      var wasOpen = item.classList.contains('is-open');
      $$('.acc-item.is-open', acc).forEach(function(x){ x.classList.remove('is-open'); });
      if (!wasOpen) item.classList.add('is-open');
    });
  }

  /* ---------- ROUTER ---------- */
  var ROUTES = {
    home:   { render: viewHome,  mount: mountHome },
    editor: {
      render: function(){ return ''; },
      mount: function(){
        if (window.MajesticEditor) window.MajesticEditor.mount();
      },
      unmount: function(){
        if (window.MajesticEditor) window.MajesticEditor.unmount();
      },
    },
    guide:  { render: viewGuide, mount: mountGuide },
  };

  function parseHash(){
    var raw = location.hash.replace(/^#\/?/, '') || 'home';
    var name = raw.split('/')[0];
    return ROUTES[name] ? name : 'home';
  }

  var currentRoute = null;

  function render(){
    var name = parseHash();
    var route = ROUTES[name];
    var view = $('#view');
    if (!view) return;

    // cleanup previous
    if (currentRoute && ROUTES[currentRoute] && ROUTES[currentRoute].unmount){
      try { ROUTES[currentRoute].unmount(); } catch (e){ console.warn(e); }
    }

    // reset view classes
    view.className = 'view';
    view.classList.add(name === 'editor' ? 'fullwidth' : 'centered');

    // nav
    $$('[data-nav]').forEach(function(a){
      a.classList.toggle('is-active', a.dataset.nav === name);
    });

    // content
    var html = route.render();
    if (name === 'editor'){
      // editor builds itself via mount(); give it an empty container
      view.innerHTML = html;
      if (route.mount) route.mount();
    } else {
      view.innerHTML = html;
      if (route.mount) route.mount();
    }

    window.scrollTo({ top: 0 });
    currentRoute = name;
  }

  /* ---------- BOOT ---------- */
  function boot(){
    initCursor();
    bindRipples();
    window.addEventListener('hashchange', render);
    render();
    setTimeout(function(){
      var pre = $('#preloader');
      if (pre) pre.classList.add('is-done');
    }, 450);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();