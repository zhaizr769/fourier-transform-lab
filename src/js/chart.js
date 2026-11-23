/* ==========================================================================
   chart.js —— Canvas 绘图引擎（DPR 自适应 / nice ticks / π 刻度 /
                折线·虚线·冲激谱线·填充 / 悬停读数 / 导出 PNG）
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT;
  var C = FT.COLORS = {
    grid: '#eaf0f8',
    gridStrong: '#d6e0ef',
    axis: '#8d9cb5',
    ink: '#14213d',
    muted: '#5b6a82',
    x: '#1d4e89',
    x2: '#2f6db3',
    ghost: '#a9b6c9',
    mag: '#c2410c',
    phase: '#6d28d9',
    y: '#0f7a4d',
    accent: '#0f8a8a',
    sys: '#6d28d9',
    danger: '#b91c1c',
    fill: 'rgba(29,78,137,.10)',
    fillMag: 'rgba(194,65,12,.10)',
    white: '#ffffff'
  };

  function Chart(canvas, readout, opts) {
    opts = opts || {};
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.ro = readout || null;
    this.o = opts;
    this.series = [];
    this.impulses = [];
    this.marks = [];
    this.hLines = [];
    this.vLines = [];
    this.xmin = opts.xmin === undefined ? -10 : opts.xmin;
    this.xmax = opts.xmax === undefined ? 10 : opts.xmax;
    this.ymin = null; this.ymax = null;
    this.autoY = true;
    this.padY = opts.padY === undefined ? 0.12 : opts.padY;
    this.hover = null;
    this.pinned = null;
    this.bindEvents();
  }

  Chart.prototype.setDomain = function (a, b) { this.xmin = a; this.xmax = b; };

  Chart.prototype.setSeries = function (list) { this.series = list || []; };

  Chart.prototype.setImpulses = function (list) { this.impulses = list || []; };

  Chart.prototype.setMarks = function (list) { this.marks = list || []; };

  Chart.prototype.setHLine = function (list) { this.hLines = list || []; };

  Chart.prototype.setVLine = function (list) { this.vLines = list || []; };

  Chart.prototype.resetY = function () { this.autoY = true; };

  Chart.prototype.bindEvents = function () {
    var self = this;
    this.cv.addEventListener('mousemove', function (e) {
      var r = self.cv.getBoundingClientRect();
      self.hover = { x: e.clientX - r.left, y: e.clientY - r.top };
      self.updateReadout();
    });
    this.cv.addEventListener('mouseleave', function () {
      self.hover = null;
      if (self.ro) self.ro.classList.remove('on');
      self.draw();
    });
    this.cv.addEventListener('click', function () {
      self.pinned = self.hover ? { x: self.hover.x, y: self.hover.y } : null;
    });
    this.cv.addEventListener('dblclick', function () {
      self.autoY = true; self.draw();
    });
  };

  Chart.prototype.geom = function () {
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var w = this.cv.clientWidth || 420, h = this.cv.clientHeight || 210;
    if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)) {
      this.cv.width = Math.round(w * dpr);
      this.cv.height = Math.round(h * dpr);
    }
    var padL = this.o.padL === undefined ? 48 : this.o.padL;
    var padR = this.o.padR === undefined ? 12 : this.o.padR;
    var padT = this.o.padT === undefined ? 12 : this.o.padT;
    var padB = this.o.padB === undefined ? 24 : this.o.padB;
    return {
      dpr: dpr, w: w, h: h,
      L: padL, R: w - padR, T: padT, B: h - padB,
      pw: w - padL - padR, ph: h - padT - padB
    };
  };

  Chart.prototype.xToPx = function (x, g) { return g.L + (x - this.xmin) / (this.xmax - this.xmin) * g.pw; };
  Chart.prototype.pxToX = function (px, g) { return this.xmin + (px - g.L) / g.pw * (this.xmax - this.xmin); };
  Chart.prototype.yToPx = function (y, g) { return g.B - (y - this.ymin) / (this.ymax - this.ymin) * g.ph; };

  Chart.prototype.computeY = function () {
    var lo = Infinity, hi = -Infinity, self = this;
    function consider(v) {
      if (!isFinite(v)) return;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    this.series.forEach(function (s) {
      if (s.hidden) return;
      var y = s.y, n = Math.min(y.length, s.x ? s.x.length : 0);
      for (var i = 0; i < n; i++) {
        if (s.x && (s.x[i] < self.xmin - 1e-12 || s.x[i] > self.xmax + 1e-12)) continue;
        consider(y[i]);
      }
    });
    this.impulses.forEach(function (q) { if (q.x >= self.xmin && q.x <= self.xmax) { consider(q.y); consider(0); } });
    if (!isFinite(lo) || !isFinite(hi)) { lo = -1; hi = 1; }
    if (hi - lo < 1e-12) { hi = lo + 1; lo -= 1; }
    /* 尽量把 0 留在视野里 */
    if (lo > 0 && lo < (hi - lo) * 0.6) lo = 0;
    if (hi < 0 && -hi < (hi - lo) * 0.6) hi = 0;
    var pad = (hi - lo) * this.padY;
    this.ymin = lo - pad;
    this.ymax = hi + pad;
  };

  Chart.prototype.fmtX = function (v, step) {
    if (this.o.piTicks) return FT.fmtPi(v, step);
    if (this.o.xFmt) return this.o.xFmt(v);
    return FT.fmt(v, Math.abs(step) < 1 ? 2 : (Math.abs(step) < 10 ? 1 : 0));
  };

  Chart.prototype.draw = function () {
    var g = this.geom(), ctx = this.ctx;
    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    ctx.clearRect(0, 0, g.w, g.h);
    ctx.fillStyle = '#fdfefe';
    ctx.fillRect(0, 0, g.w, g.h);
    if (this.autoY) this.computeY();
    if (this.ymin === null || this.ymax === null) this.computeY();

    var xt = FT.niceTicks(this.xmin, this.xmax, Math.max(3, Math.round(g.pw / 78)));
    var yt = FT.niceTicks(this.ymin, this.ymax, Math.max(2, Math.round(g.ph / 42)));

    /* 网格 */
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.grid;
    ctx.beginPath();
    xt.ticks.forEach(function (v) {
      var px = Math.round(this.xToPx(v, g)) + .5;
      if (px < g.L - .5 || px > g.R + .5) return;
      ctx.moveTo(px, g.T); ctx.lineTo(px, g.B);
    }, this);
    yt.ticks.forEach(function (v) {
      var py = Math.round(this.yToPx(v, g)) + .5;
      ctx.moveTo(g.L, py); ctx.lineTo(g.R, py);
    }, this);
    ctx.stroke();

    /* 零轴 */
    ctx.strokeStyle = C.gridStrong;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (this.ymin < 0 && this.ymax > 0) {
      var zy = Math.round(this.yToPx(0, g)) + .5;
      ctx.moveTo(g.L, zy); ctx.lineTo(g.R, zy);
    }
    if (this.xmin < 0 && this.xmax > 0) {
      var zx = Math.round(this.xToPx(0, g)) + .5;
      ctx.moveTo(zx, g.T); ctx.lineTo(zx, g.B);
    }
    ctx.stroke();

    /* 边框 */
    ctx.strokeStyle = C.gridStrong;
    ctx.lineWidth = 1;
    ctx.strokeRect(g.L + .5, g.T + .5, g.pw - 1, g.ph - 1);

    /* 刻度标签 */
    ctx.fillStyle = C.muted;
    ctx.font = '11px ' + (this.o.font || 'Consolas, monospace');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    xt.ticks.forEach(function (v) {
      var px = this.xToPx(v, g);
      if (px < g.L - 1 || px > g.R + 1) return;
      ctx.fillText(this.fmtX(v, xt.step), px, g.B + 5);
    }, this);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yt.ticks.forEach(function (v) {
      var py = this.yToPx(v, g);
      ctx.fillText(FT.fmt(v, Math.abs(yt.step) < 1 ? 2 : (Math.abs(yt.step) < 10 ? 1 : 0)), g.L - 6, py);
    }, this);

    /* 轴名 */
    ctx.fillStyle = C.muted;
    ctx.font = 'italic 11.5px "Cambria Math", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    if (this.o.xlabel) ctx.fillText(this.o.xlabel, g.L + 3, g.h - 2);
    if (this.o.ylabel) {
      ctx.save();
      ctx.translate(11, g.T + 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.o.ylabel, 0, 0);
      ctx.restore();
    }

    /* 裁剪到绘图区 */
    ctx.save();
    ctx.beginPath();
    ctx.rect(g.L, g.T - 2, g.pw, g.ph + 4);
    ctx.clip();

    /* 参考竖线 */
    this.vLines.forEach(function (l) {
      var px = this.xToPx(l.x, g);
      ctx.strokeStyle = l.color || C.ghost;
      ctx.setLineDash(l.dash || [3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, g.T); ctx.lineTo(px, g.B); ctx.stroke();
      ctx.setLineDash([]);
      if (l.label) {
        ctx.fillStyle = l.color || C.muted;
        ctx.font = '10.5px Consolas, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(l.label, px + 3, g.T + 2);
      }
    }, this);

    this.hLines.forEach(function (l) {
      var py = this.yToPx(l.y, g);
      ctx.strokeStyle = l.color || C.ghost;
      ctx.setLineDash(l.dash || [4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(g.L, py); ctx.lineTo(g.R, py); ctx.stroke();
      ctx.setLineDash([]);
      if (l.label) {
        ctx.fillStyle = l.color || C.muted;
        ctx.font = '10.5px Consolas, monospace';
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText(l.label, g.R - 3, py - 2);
      }
    }, this);

    /* 曲线 */
    this.series.forEach(function (s) {
      if (s.hidden || !s.x || !s.y) return;
      if (s.fill) this.fillSeries(s, g);
      this.strokeSeries(s, g);
    }, this);

    /* 冲激谱线 */
    this.impulses.forEach(function (q) { this.drawImpulse(q, g); }, this);

    /* 悬停十字 */
    var hp = this.hover || this.pinned;
    if (hp && hp.x >= g.L && hp.x <= g.R) {
      ctx.strokeStyle = 'rgba(29,78,137,.45)';
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hp.x + .5, g.T); ctx.lineTo(hp.x + .5, g.B); ctx.stroke();
      ctx.setLineDash([]);
      var xv = this.pxToX(hp.x, g);
      this.series.forEach(function (s) {
        if (s.hidden || !s.x) return;
        var yv = sampleAt(s.x, s.y, xv);
        if (!isFinite(yv)) return;
        var py = this.yToPx(yv, g);
        ctx.fillStyle = s.color || C.x;
        ctx.beginPath(); ctx.arc(hp.x, py, 3, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
      }, this);
    }

    ctx.restore();
  };

  Chart.prototype.strokeSeries = function (s, g) {
    var ctx = this.ctx, n = Math.min(s.x.length, s.y.length);
    ctx.strokeStyle = s.color || C.x;
    ctx.lineWidth = s.width || 1.9;
    ctx.globalAlpha = s.alpha === undefined ? 1 : s.alpha;
    if (s.dash) ctx.setLineDash(s.dash);
    ctx.beginPath();
    var pen = false;
    for (var i = 0; i < n; i++) {
      var y = s.y[i], x = s.x[i];
      if (!isFinite(y) || Math.abs(y) > 1e12) { pen = false; continue; }
      var px = this.xToPx(x, g), py = this.yToPx(y, g);
      if (!pen) { ctx.moveTo(px, py); pen = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  };

  Chart.prototype.fillSeries = function (s, g) {
    var ctx = this.ctx, n = Math.min(s.x.length, s.y.length);
    var base = this.yToPx(s.fillBase === undefined ? 0 : s.fillBase, g);
    ctx.fillStyle = s.fill;
    ctx.globalAlpha = s.alpha === undefined ? 1 : s.alpha;
    ctx.beginPath();
    var started = false, firstPx = 0;
    for (var i = 0; i < n; i++) {
      var y = s.y[i];
      if (!isFinite(y)) continue;
      var px = this.xToPx(s.x[i], g), py = this.yToPx(y, g);
      if (!started) { ctx.moveTo(px, base); ctx.lineTo(px, py); firstPx = px; started = true; }
      else ctx.lineTo(px, py);
    }
    if (started) {
      ctx.lineTo(this.xToPx(s.x[n - 1], g), base);
      ctx.lineTo(firstPx, base);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  Chart.prototype.drawImpulse = function (q, g) {
    var ctx = this.ctx;
    var px = this.xToPx(q.x, g);
    if (px < g.L - 2 || px > g.R + 2) return;
    var py0 = this.yToPx(0, g), py1 = this.yToPx(q.y, g);
    var col = q.color || C.mag;
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineWidth = q.width || 2;
    ctx.globalAlpha = q.alpha === undefined ? 1 : q.alpha;
    ctx.beginPath(); ctx.moveTo(px, py0); ctx.lineTo(px, py1); ctx.stroke();
    /* 箭头 */
    var dir = py1 <= py0 ? -1 : 1;
    var ah = Math.min(9, Math.abs(py1 - py0) * 0.5);
    ctx.beginPath();
    ctx.moveTo(px, py1);
    ctx.lineTo(px - 4, py1 - dir * ah);
    ctx.lineTo(px + 4, py1 - dir * ah);
    ctx.closePath(); ctx.fill();
    if (q.label) {
      ctx.font = '10.5px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = dir < 0 ? 'bottom' : 'top';
      ctx.fillText(q.label, px, py1 - dir * 2);
    }
    ctx.globalAlpha = 1;
  };

  function sampleAt(xs, ys, x) {
    var n = Math.min(xs.length, ys.length);
    if (n === 0) return NaN;
    if (x < xs[0] || x > xs[n - 1]) return NaN;
    var i = Math.round((x - xs[0]) / (xs[1] - xs[0]));
    if (i < 0) i = 0; if (i > n - 2) i = n - 2;
    var t = (x - xs[i]) / (xs[i + 1] - xs[i]);
    return ys[i] + (ys[i + 1] - ys[i]) * t;
  }
  Chart.prototype.sample = sampleAt;

  Chart.prototype.updateReadout = function () {
    if (!this.ro) return;
    var g = this.geom();
    var hp = this.hover;
    if (!hp || hp.x < g.L || hp.x > g.R) { this.ro.classList.remove('on'); this.draw(); return; }
    var xv = this.pxToX(hp.x, g);
    var txt = (this.o.xLabel || 'x') + ' = ' + (this.o.piRead && Math.abs(xv) > 1e-9 ? (xv / Math.PI).toFixed(3) + 'π' : FT.fmt(xv, 3));
    var self = this;
    this.series.forEach(function (s) {
      if (s.hidden || !s.x || !s.label) return;
      var y = sampleAt(s.x, s.y, xv);
      txt += '   ' + s.label + ' = ' + FT.fmt(y, 4);
    });
    if (this.impulses.length) {
      var near = null, bd = Infinity;
      for (var i = 0; i < this.impulses.length; i++) {
        var d = Math.abs(this.impulses[i].x - xv);
        if (d < bd) { bd = d; near = this.impulses[i]; }
      }
      if (near && bd < (this.xmax - this.xmin) / 60) txt += '   谱线 ' + FT.fmt(near.y, 4);
    }
    this.ro.textContent = txt;
    this.ro.classList.add('on');
    this.draw();
  };

  Chart.prototype.exportPNG = function (name) {
    try {
      var a = document.createElement('a');
      a.download = (name || 'chart') + '.png';
      a.href = this.cv.toDataURL('image/png');
      a.click();
      return true;
    } catch (e) { return false; }
  };

  /* 迷你图：一次性画好，不绑定交互 */
  FT.miniDraw = function (canvas, spec) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var w = canvas.clientWidth || canvas.width || 180;
    var h = canvas.clientHeight || canvas.height || 78;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var L = 22, R = w - 5, T = 6, B = h - 13;
    var pw = R - L, ph = B - T;
    var xmin = spec.xmin, xmax = spec.xmax;
    var lo = Infinity, hi = -Infinity;
    (spec.series || []).forEach(function (s) {
      for (var i = 0; i < s.y.length; i++) {
        var v = s.y[i];
        if (!isFinite(v)) continue;
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
    });
    (spec.impulses || []).forEach(function (q) { if (isFinite(q.y)) { if (q.y < lo) lo = q.y; if (q.y > hi) hi = q.y; } });
    if (!isFinite(lo)) { lo = -1; hi = 1; }
    if (hi - lo < 1e-12) { hi = lo + 1; lo -= 1; }
    if (lo > 0) lo = 0;
    if (hi < 0) hi = 0;
    var pad = (hi - lo) * 0.14; lo -= pad; hi += pad;
    function X(x) { return L + (x - xmin) / (xmax - xmin) * pw; }
    function Y(y) { return B - (y - lo) / (hi - lo) * ph; }

    ctx.strokeStyle = '#eef3fa'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; gx <= 4; gx++) { var px = L + pw * gx / 4; ctx.moveTo(px, T); ctx.lineTo(px, B); }
    ctx.stroke();
    if (lo < 0 && hi > 0) {
      ctx.strokeStyle = '#dbe4f0';
      ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(R, Y(0)); ctx.stroke();
      if (xmin < 0 && xmax > 0) { ctx.beginPath(); ctx.moveTo(X(0), T); ctx.lineTo(X(0), B); ctx.stroke(); }
    } else if (xmin < 0 && xmax > 0) {
      ctx.strokeStyle = '#dbe4f0';
      ctx.beginPath(); ctx.moveTo(X(0), T); ctx.lineTo(X(0), B); ctx.stroke();
    }
    ctx.strokeStyle = '#e6ecf6'; ctx.strokeRect(L + .5, T + .5, pw - 1, ph - 1);

    (spec.series || []).forEach(function (s) {
      ctx.strokeStyle = s.color || C.x;
      ctx.lineWidth = s.width || 1.5;
      ctx.globalAlpha = s.alpha === undefined ? 1 : s.alpha;
      if (s.dash) ctx.setLineDash(s.dash);
      ctx.beginPath();
      var pen = false;
      for (var i = 0; i < s.y.length; i++) {
        var y = s.y[i];
        if (!isFinite(y)) { pen = false; continue; }
        var px = X(s.x[i]), py = y > hi ? T : (y < lo ? B : Y(y));
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });
    (spec.impulses || []).forEach(function (q) {
      var px = X(q.x), py0 = Y(0), py1 = Y(q.y);
      ctx.strokeStyle = q.color || C.mag; ctx.fillStyle = q.color || C.mag;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(px, py0); ctx.lineTo(px, py1); ctx.stroke();
      var dir = py1 <= py0 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(px, py1); ctx.lineTo(px - 3, py1 - dir * 6); ctx.lineTo(px + 3, py1 - dir * 6);
      ctx.closePath(); ctx.fill();
    });

    ctx.fillStyle = '#8494ab';
    ctx.font = '9.5px Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(FT.fmt(xmin, 1), L + 8, B + 2);
    ctx.fillText(FT.fmt(xmax, 1), R - 10, B + 2);
    ctx.textAlign = 'left';
    ctx.fillText(FT.fmt(hi, 2), 1, T);
    ctx.textBaseline = 'bottom';
    ctx.fillText(FT.fmt(lo, 2), 1, B);
  };

  global.Chart = Chart;
})(window);
