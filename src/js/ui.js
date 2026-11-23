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
    lab.appendChild(UI.el('span', { class: 'pname', textContent: cfg.label || cfg.key }));
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
      // mx 已经是纯文本，直接显示
      b.appendChild(UI.el('span', { class: 'chip-mx', text: mx }));
    }
    b.setText = function (t) { b.querySelector('.chip-name').textContent = t; };
    b.setMx = function (m) { b.querySelector('.chip-mx').textContent = m; };
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
    // 替换 _{...} 为 <sub>...</sub>
    text = String(text).replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
    // 替换 ^{...} 为 <sup>...</sup>
    text = text.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
    // 替换单个 _x 和 ^x（如果后面没有 {）
    text = text.replace(/_([a-zA-Z0-9])/g, '<sub>$1</sub>');
    text = text.replace(/\^([a-zA-Z0-9])/g, '<sup>$1</sup>');
    return text;
  };

})(window);
