/* ==========================================================================
   topicsview.js —— 课件补充专题：
   1 离散谱→连续谱  2 时宽↔频宽  3 Gibbs  4 带宽  5 对偶性
   6 Parseval      7 u(t) 的频谱  8 采样定理
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML, C = FT.COLORS;
  var PI = Math.PI, TAU = 2 * Math.PI;
  var Topics = FT.Topics = {};

  var container, current = 'lines2cont', live = [];

  function sa(x) { return Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x; }

  /* ---------------------------------------------------- 面板工厂 */
  function makeRow(parent) {
    var r = UI.el('div', { class: 'mod-charts-row' });
    parent.appendChild(r);
    return r;
  }
  function makeStack(parent) {
    var s = UI.el('div', { class: 'topic-charts' });
    parent.appendChild(s);
    return s;
  }

  function panel(parent, title, height) {
    var card = UI.el('div', { class: 'chart-card' });
    var head = UI.el('div', { class: 'chart-head' });
    head.appendChild(UI.el('div', { class: 'chart-title', text: title }));
    var act = UI.el('div', { class: 'chart-actions' });
    var bFit = UI.el('button', { class: 'btn btn-tiny', text: '自适应', onclick: function () { ch.resetY(); ch.draw(); } });
    var bExp = UI.el('button', { class: 'btn btn-tiny', text: '导出', onclick: function () { ch.exportPNG('ft-topic'); UI.toast('已导出 PNG'); } });
    act.appendChild(bFit); act.appendChild(bExp);
    head.appendChild(act);
    card.appendChild(head);
    var box = UI.el('div', { class: 'canvas-box', style: 'height:' + (height || 190) + 'px' });
    var cv = UI.el('canvas'), ro = UI.el('div', { class: 'chart-readout' });
    box.appendChild(cv); box.appendChild(ro);
    card.appendChild(box);
    parent.appendChild(card);
    var ch = new Chart(cv, ro, { piTicks: true, padL: 50 });
    live.push(ch);
    return ch;
  }

  function sidePanel(parent, title) {
    var p = UI.el('div', { class: 'panel' });
    p.appendChild(UI.el('div', { class: 'panel-head' }, [UI.el('h2', { text: title })]));
    parent.appendChild(p);
    return p;
  }

  function readouts(parent, items) {
    var g = UI.el('div', { class: 'insight-grid' });
    g.innerHTML = items.map(function (m) {
      return '<div class="insight' + (m.hi ? ' accent' : '') + '"><div class="k">' + m.k + '</div><div class="v' + (m.mx ? ' mx' : '') + '">' + m.v + '</div></div>';
    }).join('');
    parent.appendChild(g);
    return g;
  }

  function notes(parent, list) {
    var d = UI.el('div', { class: 'formula-notes' });
    d.innerHTML = list.map(function (n) { return '<span class="note ' + n.cls + '">' + n.text + '</span>'; }).join('');
    parent.appendChild(d);
    return d;
  }

  function head(host, title, desc, formula) {
    var d = UI.el('div', { class: 'topic-head' });
    d.appendChild(UI.el('h3', { text: title }));
    if (desc) d.appendChild(UI.el('p', { text: desc }));
    if (formula) d.appendChild(UI.el('div', { class: 'formula-box', style: 'margin-top:10px', textContent: formula }));
    host.appendChild(d);
  }

  function grid(host) {
    var g = UI.el('div', { class: 'topic-body-grid' });
    host.appendChild(g);
    var left = UI.el('div', {});
    var right = UI.el('div', { class: 'topic-side' });
    g.appendChild(left); g.appendChild(right);
    return { left: left, right: right };
  }

  /* 动画按钮 */
  function animButton(box, get, set, lo, hi, refresh, label) {
    var playing = null;
    var b = UI.el('button', { class: 'play-btn', text: '▶ ' + (label || '自动扫描') });
    b.addEventListener('click', function () {
      if (playing) { cancelAnimationFrame(playing); playing = null; b.textContent = '▶ ' + (label || '自动扫描'); b.classList.remove('alt'); return; }
      b.textContent = '⏸ 暂停'; b.classList.add('alt');
      var dir = 1;
      function step() {
        var v = get() + dir * (hi - lo) / 260;
        if (v >= hi) { v = hi; dir = -1; }
        if (v <= lo) { v = lo; dir = 1; }
        set(v); refresh();
        playing = requestAnimationFrame(step);
      }
      playing = requestAnimationFrame(step);
    });
    box.appendChild(b);
    return b;
  }

  /* ================================================================ 专题 1 */
  function topicLines(host) {
    var st = { T0: 6, T1: 1, wmax: 12 };
    head(host, '① 周期 T₀ → ∞：离散谱如何长成连续谱',
      '课件 slide 7–11：周期矩形脉冲的谱线高度按 1/T₀ 下降、间隔按 2π/T₀ 变密，但包络 2T₁Sa(ωT₁) 始终不变。' +
      '把 T₀ 一路推到很大，就得到非周期单个矩形脉冲的连续频谱。');
    var g = grid(host), L = g.left, R = g.right;
    var stack = makeStack(L);
    var chT = panel(stack, '时域：周期矩形脉冲', 160);
    var chF = panel(stack, '频谱：谱线 2πa_k 与包络 X(jω)', 230);

    var side = sidePanel(R, '参数');
    var sT0 = UI.sliderRow({ key: 'T0', label: 'T_{0}', min: 2.5, max: 40, step: 0.25, desc: '周期' }, st.T0, function (v) { st.T0 = v; upd(); });
    var sT1 = UI.sliderRow({ key: 'T1', label: 'T_{1}', min: 0.3, max: 4, step: 0.05, desc: '脉冲半宽' }, st.T1, function (v) { st.T1 = v; upd(); });
    side.appendChild(sT0); side.appendChild(sT1);
    var animBox = UI.el('div', { class: 'btn-row' });
    side.appendChild(animBox);
    var roBox = UI.el('div', {});
    R.appendChild(roBox);
    var noteBox = UI.el('div', {});
    R.appendChild(noteBox);

    var sig = FT.getSignal('periodicRect');
    function upd() {
      var p = { T0: st.T0, T1: st.T1 };
      var lay = FT.buildBaseLayer(sig, p);
      var tmax = Math.min(60, st.T0 * 2.4);
      var r = FT.render(lay, { tmin: -tmax, tmax: tmax, Nt: 700, wmin: -st.wmax, wmax: st.wmax, Nw: 1200, wmaxAbs: st.wmax, reconstructTime: false });
      chT.setDomain(-tmax, tmax);
      chT.setSeries([{ x: r.t, y: r.xre, color: C.x, width: 1.8, label: 'x' }]);
      chT.setImpulses([]); chT.draw();

      var env = new Float64Array(r.w.length);
      for (var i = 0; i < r.w.length; i++) env[i] = 2 * st.T1 * sa(r.w[i] * st.T1);
      chF.setDomain(-st.wmax, st.wmax);
      chF.setSeries([
        { x: r.w, y: env, color: C.ghost, width: 1.5, dash: [5, 4], label: '包络' },
        { x: r.w, y: r.Xre, color: C.mag, width: 1.2, alpha: .001, label: '' }
      ]);
      chF.setImpulses(r.wimp.map(function (q) { return { x: q.w, y: q.re, color: C.mag, width: 2.2 }; }));
      chF.draw();

      var w0 = TAU / st.T0;
      UI.clear(roBox);
      readouts(roBox, [
        { k: '谱线间隔 ω₀ = 2π/T₀', v: UI.trim(w0) + ' rad/s', hi: true },
        { k: '中心谱线高度 2πa₀', v: UI.trim(TAU * 2 * st.T1 / st.T0) },
        { k: '包络峰值 X(j0)', v: UI.trim(2 * st.T1), hi: true },
        { k: '第一过零点 π/T₁', v: UI.trim(PI / st.T1) },
        { k: '窗口内谱线条数', v: String(r.wimp.length) },
        { k: 'T₀·a₀', v: UI.trim(st.T0 * 2 * st.T1 / st.T0) + ' = 2T₁（不变）' }
      ]);
      UI.clear(noteBox);
      notes(noteBox, [
        { cls: 'key', text: '谱线高度 = 2πa_k = Δω·X(jω)|_{ω=kω₀}（Δω=2π/T₀），即「包络 × 谱线间隔」。间隔趋于 0 时高度也趋于 0，但比值 X(jω) 保持有限 —— 这就是频谱密度函数的来历。' },
        { cls: 'tip', text: '看包络：它只跟 T₁ 有关，与 T₀ 完全无关。改变周期只改变「取样密度」，不改变包络形状。' }
      ]);
      if (animBox.childNodes.length < 2) {
        animButton(animBox, function () { return st.T0; }, function (v) { st.T0 = v; sT0.set(v); }, 2.5, 40, upd, 'T₀ 扫描');
      }
    }
    upd();
  }

  /* ================================================================ 专题 2 */
  function topicUncertainty(host) {
    var st = { T1: 1.6 };
    head(host, '② 时域越窄，频域越宽',
      '课件 slide 20 的结论：「信号在时域和频域之间有一种相反的关系」。宽度 2T₁ 的门函数，峰值 2T₁、第一零点 π/T₁，' +
      '两者的乘积恒等于 π —— 这就是不确定性原理在这一章的样子。');
    var g = grid(host), L = g.left, R = g.right;
    var row = makeRow(L);
    var chT = panel(row, 'x(t)：门宽 2T₁', 175);
    var chM = panel(row, '|X(jω)| = 2T₁|Sa(ωT₁)|', 175);
    var row2 = makeRow(L);
    var chM2 = panel(row2, '峰值 × 主瓣半宽 = 常数（纵轴为乘积）', 150);

    var side = sidePanel(R, '参数');
    var s = UI.sliderRow({ key: 'T1', label: 'T_{1}', min: 0.25, max: 4, step: 0.05, desc: '半宽' }, st.T1, function (v) { st.T1 = v; upd(); });
    side.appendChild(s);
    var ab = UI.el('div', { class: 'btn-row' }); side.appendChild(ab);
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    var prod = [], prodX = [];
    function upd() {
      var T1 = st.T1;
      var sig = FT.getSignal('gate');
      var lay = FT.buildBaseLayer(sig, { T1: T1 });
      var tm = Math.max(4, T1 * 4), wm = Math.min(60, 3.2 * PI / T1);
      var r = FT.render(lay, { tmin: -tm, tmax: tm, Nt: 600, wmin: -wm, wmax: wm, Nw: 1400, wmaxAbs: wm, reconstructTime: false });
      var n = r.w.length, mag = new Float64Array(n);
      for (var i = 0; i < n; i++) mag[i] = Math.abs(r.Xre[i]);
      chT.setDomain(-tm, tm);
      chT.setSeries([{ x: r.t, y: r.xre, color: C.x, width: 2, fill: C.fill, label: 'x' }]);
      chT.setVLine([{ x: -T1, label: '−T₁', color: '#c9d5e8' }, { x: T1, label: 'T₁', color: '#c9d5e8' }]);
      chT.draw();
      chM.setDomain(-wm, wm);
      chM.setSeries([{ x: r.w, y: mag, color: C.mag, width: 2, label: '|X|' }]);
      chM.setVLine([{ x: PI / T1, label: 'π/T₁', color: '#f0c9a8' }, { x: -PI / T1, label: '−π/T₁', color: '#f0c9a8' }]);
      chM.draw();

      prod = []; prodX = [];
      for (var q = 0.25; q <= 4.01; q += 0.05) { prod.push(2 * q * PI / q); prodX.push(q); }
      chM2.setDomain(0.25, 4);
      chM2.setSeries([
        { x: prodX, y: prod, color: C.y, width: 2, label: '峰值×半主瓣' },
        { x: [0.25, 4], y: [2 * PI, 2 * PI], color: C.ghost, width: 1.2, dash: [5, 4] }
      ]);
      chM2.setVLine([{ x: T1, label: '当前 T₁', color: '#c9d5e8' }]);
      chM2.draw();

      UI.clear(roBox);
      readouts(roBox, [
        { k: '时域脉宽 2T₁', v: UI.trim(2 * T1) + ' s', hi: true },
        { k: '频谱峰值 X(j0)', v: UI.trim(2 * T1) + '（= 面积）', hi: true },
        { k: '第一零点 π/T₁', v: UI.trim(PI / T1) + ' rad/s' },
        { k: '主瓣全宽 2π/T₁', v: UI.trim(2 * PI / T1) + ' rad/s' },
        { k: '峰值 × 主瓣半宽', v: UI.trim(2 * T1 * PI / T1) + ' = 2π（恒定）' },
        { k: '面积 × 带宽', v: UI.trim(2 * T1 * 2 * PI / T1) + ' = 4π（恒定）' }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: '面积（=X(j0)）与主瓣宽度成反比，乘积恒为常数。想压缩频谱就得摊宽时域，反之亦然 —— 任何「既窄又带限」的信号都不存在。' },
        { cls: 'tip', text: '工程含义：要传输更宽的频带，就必须用更短的脉冲；反过来，短脉冲（如冲激）天然覆盖全频谱。' }
      ]);
      if (ab.childNodes.length < 2) animButton(ab, function () { return st.T1; }, function (v) { st.T1 = v; s.set(v); }, 0.25, 4, upd, 'T₁ 扫描');
    }
    upd();
  }

  /* ================================================================ 专题 3 */
  function topicGibbs(host) {
    var st = { N: 6, wmax: 30 };
    head(host, '③ 收敛与 Gibbs 现象',
      '课件 slide 15：傅里叶积分在间断点处收敛于左右极限的平均值，而不是函数本身；' +
      '并且在间断点附近出现过冲，极限值约 8.949% —— 加再多谐波也不会消失，只会向间断点挤压。');
    var g = grid(host), L = g.left, R = g.right;
    var stack = makeStack(L);
    var ch1 = panel(stack, '方波的傅里叶级数部分和（虚线 = 目标方波）', 200);
    var ch2 = panel(stack, '过冲百分比随谐波次数 N 的变化（渐近 8.949%）', 165);

    var side = sidePanel(R, '参数');
    var s = UI.sliderRow({ key: 'N', label: 'N', min: 1, max: 80, step: 1, desc: '保留的谐波项数' }, st.N, function (v) { st.N = v; upd(); });
    side.appendChild(s);
    var ab = UI.el('div', { class: 'btn-row' }); side.appendChild(ab);
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    var w0 = 1;
    function partial(t, N) {
      var s = 0;
      for (var m = 0; m < N; m++) {
        var k = 2 * m + 1;
        s += Math.sin(k * w0 * t) * 4 / (k * PI);
      }
      return s;
    }
    function upd() {
      var tm = 8, nt = 900;
      var tt = FT.linspace(-tm, tm, nt), yy = new Float64Array(nt), sq = new Float64Array(nt);
      for (var i = 0; i < nt; i++) {
        yy[i] = partial(tt[i], st.N);
        var m = ((tt[i] + PI) % TAU + TAU) % TAU;
        sq[i] = m < PI ? 1 : -1;
      }
      ch1.setDomain(-tm, tm);
      ch1.setSeries([
        { x: tt, y: sq, color: C.ghost, width: 1.3, dash: [5, 4], label: '方波' },
        { x: tt, y: yy, color: C.x, width: 2, label: 'S_N' }
      ]);
      ch1.setHLine([{ y: 1, label: '+1', color: '#dbe4f0' }, { y: -1, label: '−1', color: '#dbe4f0' }, { y: 0, label: '0（间断点的收敛值）', color: '#f0c9a8', dash: [2, 3] }]);
      ch1.setVLine([{ x: 0, label: '间断点', color: '#c9d5e8' }]);
      ch1.draw();

      var xs = [], os = [];
      for (var N = 1; N <= 80; N++) {
        xs.push(N);
        var mx = 0;
        for (var q = 0.0005; q < PI; q += 0.0005) { var v = partial(q, N); if (v > mx) mx = v; }
        os.push((mx - 1) * 100);
      }
      ch2.setDomain(1, 80);
      ch2.setSeries([
        { x: xs, y: os, color: C.phase, width: 2, label: '过冲%' },
        { x: [1, 80], y: [8.949, 8.949], color: C.danger, width: 1.3, dash: [5, 4] }
      ]);
      ch2.setVLine([{ x: st.N, label: '当前 N', color: '#c9d5e8' }]);
      ch2.draw();

      var cur = os[Math.min(79, st.N - 1)];
      UI.clear(roBox);
      readouts(roBox, [
        { k: '当前项数 N', v: String(st.N), hi: true },
        { k: '峰值过冲', v: UI.trim(cur, 2) + ' %', hi: true },
        { k: 'Gibbs 极限', v: '8.949 %（= ∫₀^π sin t dt / π − 1）' },
        { k: '间断点处收敛值', v: '0 = (1 + (−1))/2' },
        { k: '过渡带宽度', v: '≈ 2π/N ≈ ' + UI.trim(TAU / st.N, 3) }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: '过冲的百分比不随 N 减小 —— 收敛是「几乎处处」的，不是「一致」的。要消除它得用 Fejér（三角窗）平均，而不是硬截断。' },
        { cls: 'warn', text: '实验台里给门函数加「微分」，或者在系统频响里用理想低通过方波，看到的振铃就是同一个现象：频域硬截断 ⟺ 时域 sinc 卷积。' }
      ]);
      if (ab.childNodes.length < 2) animButton(ab, function () { return st.N; }, function (v) { st.N = Math.round(v); s.set(st.N); }, 1, 80, upd, 'N 扫描');
    }
    upd();
  }

  /* ================================================================ 专题 4 */
  function topicBandwidth(host) {
    var st = { a: 1, T1: 1.2 };
    head(host, '④ 带宽的两种定义',
      '课件 slide 24：(1) |X| 降到最大值的 1/√2（带内能量占一半）—— 用于单峰谱；' +
      '(2) 对 Sa 型包络取第一零点内的主瓣宽度 —— 用于矩形/抽样信号。');
    var g = grid(host), L = g.left, R = g.right;
    var row = makeRow(L);
    var ch1 = panel(row, '单边指数：3 dB 带宽', 185);
    var ch2 = panel(row, '门函数：主瓣带宽', 185);
    var row2 = makeRow(L);
    var ch3 = panel(row2, '能量累积曲线（带内能量占比）', 160);

    var side = sidePanel(R, '参数');
    side.appendChild(UI.sliderRow({ key: 'a', label: 'a', min: 0.3, max: 4, step: 0.05, desc: '指数衰减系数' }, st.a, function (v) { st.a = v; upd(); }));
    side.appendChild(UI.sliderRow({ key: 'T1', label: 'T_{1}', min: 0.4, max: 3, step: 0.05, desc: '门半宽' }, st.T1, function (v) { st.T1 = v; upd(); }));
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    function upd() {
      var wm = 22, nw = 900;
      var w = FT.linspace(-wm, wm, nw);
      var e1 = new Float64Array(nw), e2 = new Float64Array(nw), m1 = new Float64Array(nw), m2 = new Float64Array(nw);
      for (var i = 0; i < nw; i++) {
        var x = w[i];
        m1[i] = 1 / Math.sqrt(st.a * st.a + x * x);
        m2[i] = Math.abs(2 * st.T1 * sa(x * st.T1));
        e1[i] = m1[i] * m1[i];
        e2[i] = m2[i] * m2[i];
      }
      ch1.setDomain(-wm, wm);
      ch1.setSeries([{ x: w, y: m1, color: C.mag, width: 2, label: '|X|' }]);
      ch1.setHLine([{ y: 1 / (Math.SQRT2 * st.a), label: '峰值/√2', color: '#f0c9a8' }]);
      ch1.setVLine([{ x: st.a, label: 'ω₃=a', color: C.y }, { x: -st.a, label: '−a', color: C.y }]);
      ch1.draw();

      ch2.setDomain(-wm, wm);
      ch2.setSeries([{ x: w, y: m2, color: C.mag, width: 2, label: '|X|' }]);
      ch2.setVLine([{ x: PI / st.T1, label: 'π/T₁', color: C.y }, { x: -PI / st.T1, label: '−π/T₁', color: C.y }]);
      ch2.draw();

      /* 能量占比累积（单边指数） */
      var tot = 0;
      for (var q = 0; q < nw; q++) tot += e1[q] * (w[1] - w[0]);
      var acc = new Float64Array(nw), run = 0;
      for (var k = 0; k < nw; k++) {
        if (w[k] >= 0) { run += (k ? (e1[k] + e1[k - 1]) / 2 * (w[1] - w[0]) : 0); acc[k] = 2 * run / tot; }
        else acc[k] = 0;
      }
      ch3.setDomain(0, wm);
      ch3.setSeries([
        { x: w, y: acc, color: C.y, width: 2, label: '带内占比' },
        { x: [0, wm], y: [0.5, 0.5], color: C.danger, width: 1.2, dash: [5, 4] }
      ]);
      ch3.setVLine([{ x: st.a, label: 'ω=a → 50%', color: '#c9d5e8' }]);
      ch3.setHLine([]);
      ch3.draw();

      UI.clear(roBox);
      readouts(roBox, [
        { k: '指数信号峰值 |X(j0)|', v: UI.trim(1 / st.a) },
        { k: '3 dB 带宽 ω₃', v: UI.trim(st.a) + ' rad/s = ' + UI.trim(st.a / TAU) + ' Hz', hi: true },
        { k: 'ω=ω₃ 处幅度', v: UI.trim(1 / (Math.SQRT2 * st.a)) + ' = 峰值/√2' },
        { k: '带内能量占比 @ ω₃', v: '50 %（定义 1 的依据）' },
        { k: '门函数主瓣半宽', v: UI.trim(PI / st.T1) + ' rad/s', hi: true },
        { k: '门函数主瓣全宽', v: UI.trim(2 * PI / st.T1) + ' rad/s' }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'tip', text: '单边指数的能量累积正好在 ω=a 处过 50%：∫₀^a 与 ∫_a^∞ 相等。这是「半功率带宽」的物理含义。' },
        { cls: 'warn', text: '门函数的 Sa 谱没有 3 dB 点（它不是单调的），所以只能用主瓣宽度定义带宽。两种定义不能混用。' }
      ]);
    }
    upd();
  }

  /* ================================================================ 专题 5 */
  function topicDual(host) {
    var st = { T1: 1.2, W: 2.5 };
    head(host, '⑤ 对偶性：X(jt) ⟷ 2πx(−ω)',
      '课件 slide 22 / 42 的四宫格。门 ↔ Sa 与 Sa ↔ 门其实是同一条性质的两面，' +
      '把时域表达式原样搬到频域，另一侧就变成 2π 倍的反转。');
    var g = grid(host), L = g.left, R = g.right;
    var row = makeRow(L);
    var a1 = panel(row, '上排：门 x₁(t) ⟷ X₁(jω)=2T₁Sa(ωT₁)', 175);
    var a2 = panel(row, '上排的频谱', 175);
    var row2 = makeRow(L);
    var b1 = panel(row2, '下排：Sa x₂(t)=(sin Wt)/(πt) ⟷ X₂(jω)=门', 175);
    var b2 = panel(row2, '下排的频谱', 175);
    var row3 = makeRow(L);
    var c1 = panel(row3, '对偶验证：把 X₁ 当时间函数，其频谱应为 2π·门(−ω)', 175);
    var c2 = panel(row3, '（同一张图，横轴换成 ω）', 175);

    var side = sidePanel(R, '参数');
    side.appendChild(UI.sliderRow({ key: 'T1', label: 'T_{1}', min: 0.4, max: 3, step: 0.05, desc: '门半宽' }, st.T1, function (v) { st.T1 = v; upd(); }));
    side.appendChild(UI.sliderRow({ key: 'W', label: 'W', min: 0.4, max: 3, step: 0.05, desc: '理想低通截止' }, st.W, function (v) { st.W = v; upd(); }));
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    function upd() {
      var T1 = st.T1, W = st.W;
      var tm = 8, wm = 14;
      var t = FT.linspace(-tm, tm, 700), w = FT.linspace(-wm, wm, 900);
      var gateT = new Float64Array(t.length), gateW = new Float64Array(w.length);
      var sincT = new Float64Array(t.length), rectW = new Float64Array(w.length);
      var dualW = new Float64Array(w.length), dualT = new Float64Array(t.length);
      for (var i = 0; i < t.length; i++) {
        gateT[i] = Math.abs(t[i]) < T1 ? 1 : 0;
        sincT[i] = W / PI * sa(W * t[i]);
      }
      for (var j = 0; j < w.length; j++) {
        gateW[j] = 2 * T1 * Math.abs(sa(w[j] * T1));
        rectW[j] = Math.abs(w[j]) < W ? 1 : 0;
        dualW[j] = Math.abs(w[j]) < T1 ? 2 * PI : 0;
        dualT[j] = 2 * T1 * sa(t[j] * T1);
      }
      a1.setDomain(-tm, tm); a1.setSeries([{ x: t, y: gateT, color: C.x, width: 2, fill: C.fill }]); a1.setImpulses([]); a1.setVLine([]); a1.setHLine([]); a1.draw();
      a2.setDomain(-wm, wm); a2.setSeries([{ x: w, y: dualT, color: C.mag, width: 2 }]); a2.setVLine([{ x: PI / T1, label: 'π/T₁', color: '#f0c9a8' }]); a2.setHLine([]); a2.draw();
      b1.setDomain(-tm, tm); b1.setSeries([{ x: t, y: sincT, color: C.x, width: 2 }]); b1.setVLine([{ x: PI / W, label: 'π/W', color: '#c9d5e8' }]); b1.setHLine([]); b1.draw();
      b2.setDomain(-wm, wm); b2.setSeries([{ x: w, y: rectW, color: C.y, width: 2, fill: 'rgba(15,122,77,.12)' }]); b2.setVLine([{ x: W, label: 'W', color: '#f0c9a8' }, { x: -W, label: '−W', color: '#f0c9a8' }]); b2.setHLine([]); b2.draw();
      c1.setDomain(-wm, wm); c1.setSeries([{ x: w, y: dualW, color: C.y, width: 2, fill: 'rgba(15,122,77,.12)' }]); c1.setVLine([{ x: T1, label: 'T₁', color: '#c9d5e8' }, { x: -T1, label: '−T₁', color: '#c9d5e8' }]); c1.setHLine([]); c1.draw();
      c2.setDomain(-tm, tm); c2.setSeries([{ x: t, y: dualT, color: C.mag, width: 2 }]); c2.setVLine([{ x: PI / T1, label: 'π/T₁', color: '#f0c9a8' }]); c2.setHLine([]); c2.draw();

      UI.clear(roBox);
      readouts(roBox, [
        { k: '上排：门宽 2T₁', v: UI.trim(2 * T1) },
        { k: '上排：Sa 峰值 2T₁', v: UI.trim(2 * T1), hi: true },
        { k: '上排：第一零点', v: UI.trim(PI / T1) },
        { k: '下排：Sa 峰值 W/π', v: UI.trim(W / PI) },
        { k: '下排：矩形高 1、宽 2W', v: UI.trim(2 * W), hi: true },
        { k: '对偶结果高度 2π', v: UI.trim(TAU) }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: '对偶性让「时域矩形 ⟷ 频域 Sa」和「时域 Sa ⟷ 频域矩形」变成同一件事。注意高度差的那个 2π —— 它来自反变换前面的 1/2π。' },
        { cls: 'tip', text: '课件由此推出 1 ⟷ 2πδ(ω)：令 W→∞，理想低通的矩形变成整条实轴，其反变换在 t=0 附近收缩成冲激。' }
      ]);
    }
    upd();
  }

  /* ================================================================ 专题 6 */
  function topicParseval(host) {
    var st = { which: 'exp1s', a: 1, wmax: 40 };
    head(host, '⑥ Parseval：自然定律，能量守恒',
      '时域能量 = 频域能量 / 2π。右边这张图把两个积分画成阴影面积，数值上完全相等 —— 但频域那一侧必须把 ω 轴取到足够宽才收敛。');
    var g = grid(host), L = g.left, R = g.right;
    var row = makeRow(L);
    var ch1 = panel(row, '|x(t)|² 的面积 = 能量', 185);
    var ch2 = panel(row, '|X(jω)|²/(2π) 的面积 = 同一个能量', 185);

    var side = sidePanel(R, '设置');
    var sel = UI.el('select', { onchange: function () { st.which = sel.value; upd(); } });
    [['exp1s', 'e^{−at}u(t)'], ['expabs', 'e^{−a|t|}'], ['gate', '门函数 2T₁'], ['tri', '三角脉冲']].forEach(function (o) {
      sel.appendChild(UI.el('option', { value: o[0], text: o[1] }));
    });
    var f = UI.el('div', { class: 'field' });
    f.appendChild(UI.el('label', { text: '信号' }));
    f.appendChild(sel);
    side.appendChild(f);
    var sA = UI.sliderRow({ key: 'a', label: 'a / T_{1}', min: 0.3, max: 4, step: 0.05, desc: '形状参数' }, st.a, function (v) { st.a = v; upd(); });
    side.appendChild(sA);
    var sW = UI.sliderRow({ key: 'wmax', label: '\\omega_{max}', min: 6, max: 120, step: 2, desc: '频率截断（看收敛）' }, st.wmax, function (v) { st.wmax = v; upd(); });
    side.appendChild(sW);
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    function exact() {
      var a = st.a;
      if (st.which === 'exp1s') return 1 / (2 * a);
      if (st.which === 'expabs') return 1 / a;
      if (st.which === 'gate') return 2 * a;
      return 2 * a / 3;   /* tri: ∫(1-|t|/τ)² = 2τ/3 */
    }

    function upd() {
      var a = st.a;
      var sigId = st.which;
      var p = sigId === 'gate' ? { T1: a } : (sigId === 'tri' ? { tau: a } : { a: a });
      var lay = FT.buildBaseLayer(FT.getSignal(sigId), p);
      var tm = Math.max(6, 6 / Math.max(a, 0.3));
      var r = FT.render(lay, { tmin: -tm, tmax: tm, Nt: 900, wmin: -st.wmax, wmax: st.wmax, Nw: 2000, wmaxAbs: st.wmax, reconstructTime: false });
      var n = r.t.length, xt = new Float64Array(n);
      for (var i = 0; i < n; i++) xt[i] = r.xre[i] * r.xre[i] + r.xim[i] * r.xim[i];
      ch1.setDomain(-tm, tm);
      ch1.setSeries([{ x: r.t, y: xt, color: C.x, width: 2, fill: C.fill, label: '|x|²' }]);
      ch1.setImpulses([]); ch1.setVLine([]); ch1.setHLine([]);
      ch1.draw();

      var m = r.w.length, ew = new Float64Array(m);
      for (var j = 0; j < m; j++) { var mm = Math.hypot(r.Xre[j], r.Xim[j]); ew[j] = mm * mm / TAU; }
      ch2.setDomain(-st.wmax, st.wmax);
      ch2.setSeries([{ x: r.w, y: ew, color: C.mag, width: 2, fill: C.fillMag, label: '|X|²/2π' }]);
      ch2.setImpulses([]); ch2.setVLine([]); ch2.setHLine([]);
      ch2.draw();

      var eT = trap(r.t, xt), eW = trap(r.w, ew), ex = exact();
      UI.clear(roBox);
      readouts(roBox, [
        { k: '解析能量', v: UI.trim(ex), hi: true },
        { k: '时域数值 ∫|x|²dt', v: UI.trim(eT) + '（' + pct(eT, ex) + '）' },
        { k: '频域数值 (1/2π)∫|X|²dω', v: UI.trim(eW) + '（' + pct(eW, ex) + '）', hi: true },
        { k: '截断误差', v: UI.trim(Math.abs(eW - eW0(ex, st.wmax)), 4) },
        { k: '频率截断 ω_max', v: UI.trim(st.wmax) + ' rad/s' },
        { k: '两侧比值', v: UI.trim(eW / eT) + ' → 1' }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: 'Parseval 给了 X(jω) 一个物理单位：|X|²/2π 是能量密度，对频率积分得到总能量。噪声功率谱密度、3 dB 带宽都从这里来。' },
        { cls: 'warn', text: '把 ω_max 从 6 拉到 120，频域那一侧的数值才逐步逼近解析值 —— 拖这个滑块就是在亲手验证「截断误差」。注意 1/ω 拖尾（门函数）收敛最慢。' },
        { cls: 'tip', text: '周期信号不满足能量有限条件，只能用平均功率形式的 Parseval：Σ|a_k|²。' }
      ]);
    }
    function eW0(ex, wm) { return ex; }
    function pct(v, e) { return (100 * v / e).toFixed(1) + '%'; }
    function trap(x, y) { var s = 0; for (var i = 0; i < x.length - 1; i++) s += (y[i] + y[i + 1]) * (x[i + 1] - x[i]) / 2; return s; }
    upd();
  }

  /* ================================================================ 专题 7 */
  function topicStep(host) {
    var st = { alpha: 0.6 };
    head(host, '⑦ u(t) 的频谱：奇偶分解 + α→0 的收敛',
      '课件 slide 37–38：u(t) = ½ + ½Sgn(t)。偶部给 πδ(ω)，奇部给 1/(jω)。' +
      '而 Sgn 是用 e^{−α|t|} 夹逼出来的，α→0 时 Re[1/(α+jω)] 正好挤成一根面积为 π 的冲激。');
    var g = grid(host), L = g.left, R = g.right;
    var stack = makeStack(L);
    var ch0 = panel(stack, 'u(t) = 偶部 ½ + 奇部 ½Sgn(t)', 150);
    var ch1 = panel(stack, 'α/(α²+ω²)：α→0 时挤成 πδ(ω)（面积恒为 π）', 185);
    var ch2 = panel(stack, '−ω/(α²+ω²) → −1/ω 即 1/(jω) 的虚部', 185);

    var side = sidePanel(R, '参数');
    var s = UI.sliderRow({ key: 'alpha', label: '\\alpha', min: 0.02, max: 3, step: 0.02, desc: '夹逼衰减系数' }, st.alpha, function (v) { st.alpha = v; upd(); });
    side.appendChild(s);
    var ab = UI.el('div', { class: 'btn-row' }); side.appendChild(ab);
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);

    function upd() {
      var al = st.alpha, wm = 16, nw = 900;
      var w = FT.linspace(-wm, wm, nw);
      var re = new Float64Array(nw), im = new Float64Array(nw), sum = new Float64Array(nw);
      for (var i = 0; i < nw; i++) {
        var d = al * al + w[i] * w[i];
        re[i] = al / d;
        im[i] = -w[i] / d;
        sum[i] = 2 * al / d;
      }
      var tm = 6, nt = 500;
      var t = FT.linspace(-tm, tm, nt);
      var u = new Float64Array(nt), ue = new Float64Array(nt), uo = new Float64Array(nt);
      for (var j = 0; j < nt; j++) {
        u[j] = t[j] >= 0 ? 1 : 0;
        ue[j] = 0.5;
        uo[j] = t[j] > 0 ? 0.5 : (t[j] < 0 ? -0.5 : 0);
      }
      ch0.setDomain(-tm, tm);
      ch0.setSeries([
        { x: t, y: u, color: C.x, width: 2, label: 'u' },
        { x: t, y: ue, color: C.y, width: 1.5, dash: [5, 4], label: '偶部½' },
        { x: t, y: uo, color: C.phase, width: 1.5, dash: [3, 3], label: '奇部' }
      ]);
      ch0.setImpulses([]); ch0.setVLine([]); ch0.setHLine([]);
      ch0.draw();

      ch1.setDomain(-wm, wm);
      ch1.setSeries([
        { x: w, y: re, color: C.mag, width: 2, fill: C.fillMag, label: 'Re' },
        { x: w, y: new Float64Array(nw), color: C.ghost, width: 1 }
      ]);
      ch1.setVLine([]);
      ch1.setHLine([{ y: 1 / al, label: '峰值 1/α', color: '#f0c9a8' }]);
      ch1.draw();

      ch2.setDomain(-wm, wm);
      ch2.setSeries([
        { x: w, y: im, color: C.phase, width: 2, label: 'Im' },
        { x: w, y: w.map(function (x) { return Math.abs(x) < 0.05 ? NaN : -1 / x; }), color: C.ghost, width: 1.3, dash: [5, 4], label: '−1/ω' }
      ]);
      ch2.setHLine([]);
      ch2.setVLine([]);
      ch2.draw();

      /* 面积 */
      var area = trap(w, re);
      UI.clear(roBox);
      readouts(roBox, [
        { k: 'Re 峰值 1/α', v: UI.trim(1 / al), hi: true },
        { k: '半高宽', v: UI.trim(2 * al) + '（随 α 线性收缩）' },
        { k: 'Re 曲线下的面积', v: UI.trim(area) + ' → π = ' + UI.trim(PI), hi: true },
        { k: '结论', v: 'πδ(ω)（面积守恒、高度发散）' },
        { k: 'Im 在 ω=1 处', v: UI.trim(-1 / (al * al + 1)) },
        { k: 'α→0 后 u(t) 频谱', v: '1/(jω) + πδ(ω)' }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: '这就是「频谱密度发散但面积有限」的标准图像：α/(α²+ω²) 是 δ 的近似恒等序列，面积永远是 π，所以极限就是 πδ(ω)。' },
        { cls: 'warn', text: '很多同学只写 1/(jω) 丢掉 πδ(ω)，本质上是忽略了 u(t) 有非零的偶部（直流 ½）。用奇偶分解就不会漏。' }
      ]);
      if (ab.childNodes.length < 2) animButton(ab, function () { return st.alpha; }, function (v) { st.alpha = v; s.set(v); }, 0.02, 3, upd, 'α 扫描');
    }
    function trap(x, y) { var s = 0; for (var i = 0; i < x.length - 1; i++) s += (y[i] + y[i + 1]) * (x[i + 1] - x[i]) / 2; return s; }
    upd();
  }

  /* ================================================================ 专题 8 */
  function topicSampling(host) {
    var st = { T1: 1, T: 0.9, wc: 3.2 };
    head(host, '⑧ 理想抽样与采样定理',
      'x(t)·Σδ(t−nT) ⟷ (1/T)ΣX[j(ω−2πk/T)]：时域取样本，频域以 2π/T 为周期复制。' +
      '复制品不重叠的条件是 2π/T > 2ω_M，这就是奈奎斯特。');
    var g = grid(host), L = g.left, R = g.right;
    var stack = makeStack(L);
    var ch0 = panel(stack, '原信号 x(t) 与抽样点', 150);
    var ch1 = panel(stack, '原频谱 X(jω)（带宽 ω_M = π/T₁）', 180);
    var ch2 = panel(stack, '抽样后频谱：以 2π/T 复制、幅度 1/T', 185);
    var ch3 = panel(stack, '低通恢复：输出 vs 原信号（灰）', 175);

    var side = sidePanel(R, '参数');
    side.appendChild(UI.sliderRow({ key: 'T1', label: 'T_{1}', min: 0.4, max: 2.5, step: 0.05, desc: '门半宽（决定带宽）' }, st.T1, function (v) { st.T1 = v; upd(); }));
    var sT = UI.sliderRow({ key: 'T', label: 'T', min: 0.3, max: 4, step: 0.02, desc: '抽样周期' }, st.T, function (v) { st.T = v; upd(); });
    side.appendChild(sT);
    side.appendChild(UI.sliderRow({ key: 'wc', label: '\\omega_{c}', min: 0.5, max: 10, step: 0.1, desc: '恢复低通截止' }, st.wc, function (v) { st.wc = v; upd(); }));
    var roBox = UI.el('div'); R.appendChild(roBox);
    var nb = UI.el('div'); R.appendChild(nb);
    var ab = UI.el('div', { class: 'btn-row' }); side.appendChild(ab);

    var lay = FT.getSignal('gate');
    var abInited = false;
    function upd() {
      var T1 = st.T1, T = st.T, wm = Math.max(14, 3 * TAU / T);
      var base = FT.buildBaseLayer(lay, { T1: T1 });
      var samp = FT.PROP.sample.apply(base, { T: T });
      var rec = FT.lpf(samp, st.wc, T);

      var tm = Math.max(4, T1 * 3);
      var r0 = FT.render(base, { tmin: -tm, tmax: tm, Nt: 500, wmin: -wm, wmax: wm, Nw: 6, wmaxAbs: wm, reconstructTime: false });
      var r1 = FT.render(base, { tmin: -1, tmax: 1, Nt: 6, wmin: -wm, wmax: wm, Nw: 1100, wmaxAbs: wm, reconstructTime: false });
      var r2 = FT.render(samp, { tmin: -1, tmax: 1, Nt: 6, wmin: -wm, wmax: wm, Nw: 1100, wmaxAbs: wm, reconstructTime: false });
      var r3 = FT.render(rec, { tmin: -tm, tmax: tm, Nt: 700, wmin: -wm, wmax: wm, Nw: 1100, wmaxAbs: wm, reconstructTime: true });

      ch0.setDomain(-tm, tm);
      ch0.setSeries([{ x: r0.t, y: r0.xre, color: C.x, width: 2, label: 'x' }]);
      ch0.setImpulses(r0.xre.length ? sampleMarkers(r0, T) : []);
      ch0.setVLine([]); ch0.setHLine([]);
      ch0.draw();

      ch1.setDomain(-wm, wm);
      ch1.setSeries([{ x: r1.w, y: mag(r1), color: C.mag, width: 2, label: '|X|' }]);
      ch1.setVLine([{ x: PI / T1, label: 'ω_M=π/T₁', color: C.y }, { x: -PI / T1, label: '−ω_M', color: C.y }]);
      ch1.setHLine([]); ch1.setImpulses([]);
      ch1.draw();

      ch2.setDomain(-wm, wm);
      ch2.setSeries([{ x: r2.w, y: mag(r2), color: C.y, width: 2, label: '|X_s|' }]);
      ch2.setVLine(replicaLines(T, wm));
      ch2.setHLine([]); ch2.setImpulses([]);
      ch2.draw();

      ch3.setDomain(-tm, tm);
      ch3.setSeries([
        { x: r0.t, y: r0.xre, color: C.ghost, width: 1.4, dash: [5, 4], label: '原' },
        { x: r3.t, y: r3.xre, color: C.phase, width: 2, label: '恢复' }
      ]);
      ch3.setImpulses([]); ch3.setVLine([]); ch3.setHLine([]);
      ch3.draw();

      var wM = PI / T1, ws = TAU / T;
      var ok = ws > 2 * wM * 1.0001;
      UI.clear(roBox);
      readouts(roBox, [
        { k: '信号带宽 ω_M = π/T₁', v: UI.trim(wM) + ' rad/s', hi: true },
        { k: '复制间隔 2π/T', v: UI.trim(ws) + ' rad/s', hi: true },
        { k: '奈奎斯特间隔上限', v: UI.trim(PI / wM) + ' s' },
        { k: '奈奎斯特率 2ω_M', v: UI.trim(2 * wM) + ' rad/s' },
        { k: '是否混叠', v: ok ? '否 —— 可以无失真恢复 ✓' : '是 —— 复制品重叠 ✗' },
        { k: '恢复低通截止 ωc', v: UI.trim(st.wc) + (st.wc > wM && st.wc < ws - wM ? '（合适）' : '（不合适）') }
      ]);
      UI.clear(nb);
      notes(nb, [
        { cls: 'key', text: '不混叠的条件：ω_M < 2π/T − ω_M，即 T < π/ω_M。门函数的频谱有无限长尾，严格说永远会重叠一点，所以这里用主瓣宽度当作工程带宽。' },
        { cls: 'warn', text: '恢复用的理想低通截止要落在 ω_M 与 2π/T − ω_M 之间：太窄切掉信号，太宽放进复制品。' },
        { cls: 'tip', text: '抽样后幅度乘 1/T：把 T 调大（抽得稀）复制间隔变小、混叠更严重，同时每个复制品变高。' }
      ]);
      if (!abInited) {
        abInited = true;
        animButton(ab, function () { return st.T; }, function (v) { st.T = v; sT.set(v); }, 0.3, 4, upd, 'T 扫描');
      }
    }
    function mag(r) {
      var n = r.w.length, m = new Float64Array(n);
      for (var i = 0; i < n; i++) m[i] = Math.hypot(r.Xre[i], r.Xim[i]);
      return m;
    }
    function sampleMarkers(r, T) {
      var out = [], mx = 0;
      for (var i = 0; i < r.xre.length; i++) mx = Math.max(mx, r.xre[i]);
      for (var k = -Math.ceil(8 / T); k <= Math.ceil(8 / T); k++) {
        var t0 = k * T;
        if (t0 < r.t[0] || t0 > r.t[r.t.length - 1]) continue;
        var idx = Math.round((t0 - r.t[0]) / (r.t[1] - r.t[0]));
        out.push({ x: t0, y: r.xre[idx], color: C.phase, width: 1.6, label: '' });
      }
      return out;
    }
    function replicaLines(T, wm) {
      var ws = TAU / T, out = [];
      for (var k = -6; k <= 6; k++) {
        if (!k) continue;
        var w0 = k * ws;
        if (Math.abs(w0) > wm) continue;
        out.push({ x: w0, label: k + '·2π/T', color: '#c9d5e8' });
      }
      return out;
    }
    upd();
  }

  /* --------------------------------------------------------------- 注册 */
  var TOPICS = [
    { id: 'lines2cont', name: '离散谱 → 连续谱', run: topicLines },
    { id: 'uncertain', name: '时宽 ↔ 频宽', run: topicUncertainty },
    { id: 'gibbs', name: 'Gibbs 现象', run: topicGibbs },
    { id: 'bandwidth', name: '带宽的两种定义', run: topicBandwidth },
    { id: 'dual', name: '对偶性四宫格', run: topicDual },
    { id: 'parseval', name: 'Parseval 能量守恒', run: topicParseval },
    { id: 'stepspec', name: 'u(t) 的频谱', run: topicStep },
    { id: 'sampling', name: '采样定理', run: topicSampling }
  ];

  Topics.render = function () {
    var tabs = document.getElementById('topicTabs');
    UI.clear(tabs);
    TOPICS.forEach(function (t) {
      tabs.appendChild(UI.el('button', {
        class: 'topic-tab' + (t.id === current ? ' active' : ''), text: t.name,
        onclick: function () { current = t.id; Topics.render(); }
      }));
    });
    var body = document.getElementById('topicBody');
    UI.clear(body);
    live = [];
    var wrap = UI.el('div', { class: 'topic-panel' });
    body.appendChild(wrap);
    var fn = TOPICS.filter(function (t) { return t.id === current; })[0].run;
    fn(wrap);
  };

  Topics.resize = function () { live.forEach(function (c) { c.draw(); }); };

})(window);
