/* ==========================================================================
   ui.js —— 共享 UI 组件：滑块行、芯片、抽屉、模态、toast、本地存储
   ========================================================================== */
(function (global) {
  'use strict';

  var UI = global.UI = {};
  var M = global.MML;

  UI.el = function (tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'checked') e.checked = !!v;
      else if (k === 'value') e.value = v;
      else e.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  };

  UI.clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); };

  UI.debounce = function (fn, ms) {
    var t = null;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms || 90);
    };
  };

  /* ------------------------------------------------------------ 滑块行 */
  UI.sliderRow = function (cfg, value, onInput) {
    var wrap = UI.el('div', { class: 'param-row' });
    var lab = UI.el('label');
    lab.appendChild(UI.el('span', { class: 'pname', html: UI.renderMath(cfg.label || cfg.key) }));
    var right = UI.el('span', {}, [
      cfg.desc ? UI.el('span', { class: 'pdesc', text: cfg.desc }) : null,
      UI.el('span', { class: 'pnum' })
    ]);
    lab.appendChild(right);
    var inp = UI.el('input', {
      type: 'range', min: cfg.min, max: cfg.max, step: cfg.step || 0.1, value: value
    });
    var numEl = right.querySelector('.pnum');
    function show(v) {
      numEl.textContent = (cfg.fmt ? cfg.fmt(v) : UI.trim(v)) + (cfg.unit || '');
    }
    show(value);
    inp.addEventListener('input', function () {
      var v = parseFloat(inp.value);
      show(v);
      onInput(v);
    });
    wrap.appendChild(lab);
    wrap.appendChild(inp);
    wrap.set = function (v) { inp.value = v; show(v); };
    return wrap;
  };

  UI.trim = function (v) {
    if (!isFinite(v)) return '—';
    var a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e5)) return v.toExponential(1);
    var s = v.toFixed(a < 1 ? 3 : (a < 10 ? 2 : 1));
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  };

  /* -------------------------------------------------------------- 芯片 */
  UI.chip = function (text, mx, active, onClick, wide) {
    var b = UI.el('button', { class: 'chip' + (active ? ' active' : '') + (wide ? ' chip-wide' : ''), type: 'button', onclick: onClick });
    b.appendChild(UI.el('span', { class: 'chip-name', text: text }));
    if (mx) {
      b.appendChild(UI.el('span', { class: 'chip-mx', html: UI.renderMath(mx) }));
    }
    b.setText = function (t) { b.querySelector('.chip-name').textContent = t; };
    b.setMx = function (m) { b.querySelector('.chip-mx').innerHTML = UI.renderMath(m); };
    b.setActive = function (v) { b.classList.toggle('active', !!v); };
    return b;
  };

  /* ------------------------------------------------------------ toast */
  var toastEl, toastTimer;
  UI.toast = function (msg, ms) {
    toastEl = toastEl || document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, ms || 2200);
  };

  /* ------------------------------------------------------------- 模态 */
  var modal, modalTitle, modalBody;
  UI.openModal = function (title, html) {
    modal = modal || document.getElementById('modal');
    modalTitle = modalTitle || document.getElementById('modalTitle');
    modalBody = modalBody || document.getElementById('modalBody');
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.hidden = false;
  };
  UI.closeModal = function () { if (modal) modal.hidden = true; };

  /* ------------------------------------------------------------- 抽屉 */
  UI.openDrawer = function () { var d = document.getElementById('drawer'); if (d) d.hidden = false; };
  UI.closeDrawer = function () { var d = document.getElementById('drawer'); if (d) d.hidden = true; };

  /* --------------------------------------------------------- 本地存储 */
  var KEY = 'ft-lab-state-v1';
  UI.save = function (obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* 忽略隐私模式 */ }
  };
  UI.load = function () {
    try {
      var s = localStorage.getItem(KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  };
  UI.clearSave = function () { try { localStorage.removeItem(KEY); } catch (e) { } };

  /* ------------------------------------------------- 左右分栏宽度拖拽 */
  var SPLIT_KEY = 'ft-split-v1', SPLIT_DEF = 300, SPLIT_MIN = 190, curW = SPLIT_DEF;

  function splitAvail() {
    var g = document.querySelector('.lab-grid, .sys-grid, .mod-grid');
    var left = g ? g.getBoundingClientRect().left : 0;
    return Math.max(160, window.innerWidth - left - 13);
  }
  /* 手机这类超窄屏也要保持左右，所以下限按比例而不是死值；上限保证波形不被挤没 */
  function splitMin() { return Math.round(Math.min(SPLIT_MIN, Math.max(140, splitAvail() * 0.34))); }
  function splitMax() {
    var a = splitAvail();
    return Math.max(splitMin(), Math.min(760, a - Math.min(380, a * 0.55)));
  }

  function applySplit(w) {
    curW = Math.round(Math.max(splitMin(), Math.min(splitMax(), w)));
    document.documentElement.style.setProperty('--side-w', curW + 'px');
    [].slice.call(document.querySelectorAll('.col-split')).forEach(function (e) {
      e.setAttribute('aria-valuenow', curW);
      e.setAttribute('aria-valuemin', splitMin());
      e.setAttribute('aria-valuemax', Math.round(splitMax()));
    });
    return curW;
  }

  UI.initSplits = function () {
    var v = NaN;
    try { v = parseInt(localStorage.getItem(SPLIT_KEY), 10); } catch (e) { }
    applySplit(isFinite(v) && v > 0 ? v : SPLIT_DEF);

    [].slice.call(document.querySelectorAll('.col-split')).forEach(function (bar) {
      var startX = 0, base = 0;
      bar.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        startX = e.clientX; base = curW;
        bar.classList.add('on');
        document.body.style.userSelect = 'none';
        try { bar.setPointerCapture(e.pointerId); } catch (err) { }
      });
      bar.addEventListener('pointermove', function (e) {
        if (bar.classList.contains('on')) applySplit(base + (e.clientX - startX));
      });
      function end(e) {
        if (!bar.classList.contains('on')) return;
        bar.classList.remove('on');
        document.body.style.userSelect = '';
        try { bar.releasePointerCapture(e.pointerId); } catch (err) { }
        UI.saveSplit(curW);
        window.dispatchEvent(new Event('resize'));
      }
      bar.addEventListener('pointerup', end);
      bar.addEventListener('pointercancel', end);
      bar.addEventListener('dblclick', function () { UI.saveSplit(applySplit(SPLIT_DEF)); });
      bar.addEventListener('keydown', function (e) {
        var step = e.shiftKey ? 64 : 24, hit = true;
        if (e.key === 'ArrowLeft') applySplit(curW - step);
        else if (e.key === 'ArrowRight') applySplit(curW + step);
        else if (e.key === 'Home' || e.key === 'Enter') applySplit(SPLIT_DEF);
        else hit = false;
        if (hit) { e.preventDefault(); UI.saveSplit(curW); }
      });
    });

    window.addEventListener('resize', function () { applySplit(curW); });
  };
  UI.saveSplit = function (w) { try { localStorage.setItem(SPLIT_KEY, String(w)); } catch (e) { } };

  /* --------------------------------------------------- 复数格式化 */
  UI.cplx = function (re, im, d) {
    var s = UI.trim(re);
    if (Math.abs(im) > 1e-12) s += (im >= 0 ? ' +' : ' −') + ' ' + UI.trim(Math.abs(im)) + 'j';
    return s;
  };
  UI.polar = function (re, im) {
    var r = Math.hypot(re, im), th = Math.atan2(im, re);
    return UI.trim(r) + ' ∠ ' + (th * 180 / Math.PI).toFixed(1) + '°';
  };

  /* 相位友好显示：尽量用 π 表示 */
  UI.phase = function (rad) {
    if (!isFinite(rad)) return '—';
    var k = rad / Math.PI;
    var r = Math.round(k * 4) / 4;
    if (Math.abs(k - r) < 0.01) {
      if (r === 0) return '0';
      var num = Math.round(r * 4), den = 4;
      var g = function (a, b) { return b ? g(b, a % b) : a; };
      var gg = g(Math.abs(num), den); num /= gg; den /= gg;
      var sign = num < 0 ? '−' : '';
      num = Math.abs(num);
      var top = num === 1 ? 'π' : num + 'π';
      return sign + (den === 1 ? top : top + '/' + den);
    }
    return rad.toFixed(3) + ' rad';
  };

  /* 生成一组等间距 x 网格 */
  UI.grid = function (a, b, n) { return global.FT.linspace(a, b, n); };

  /* 简单数学公式渲染：把 _{} ^{} 转换为 HTML 上下标 */
  UI.renderMath = function (text) {
    if (!text) return '';
    // 先转义，再插入 <sub>/<sup>：顺序反了会把 |t|<T₁ 里的 <T₁ 当标签吃掉
    text = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    text = text.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
    text = text.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
    text = text.replace(/_([a-zA-Z0-9\u00C0-\uFFFF])/g, '<sub>$1</sub>');
    text = text.replace(/\^([a-zA-Z0-9\u00C0-\uFFFF])/g, '<sup>$1</sup>');
    return text;
  };

})(window);
