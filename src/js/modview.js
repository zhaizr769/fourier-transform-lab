/* ==========================================================================
   modview.js —— 4.5 相乘性质：幅度调制 / 同步解调 / 可调带通 / 频谱搬移混叠
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML, C = FT.COLORS;
  var PI = Math.PI, TAU = 2 * Math.PI;

  var Mod = FT.Mod = {};
  var NW = 1400, NT = 700;

  var st = Mod.state = {
    scene: 'am',
    base: 'gate',
    baseParams: { T1: 1 },
    w0: 6,
    wc: 4,
    tmax: 10,
    wmax: 24
  };

  var host, charts = [];

  /* 理想低通与常数缩放算子见 props.js 的 FT.lpf / FT.scaled */
  var lpf = FT.lpf, scaled = FT.scaled;

  function baseLayer() {
    var s = FT.getSignal(st.base);
    var p = {};
    (s.params || []).forEach(function (d) { p[d.key] = st.baseParams[d.key] !== undefined ? st.baseParams[d.key] : d.def; });
    st.baseParams = p;
    return FT.buildBaseLayer(s, p);
  }

  /* --------------------------------------------------------------- 场景 */
  function buildScene() {
    var L = baseLayer(), w0 = st.w0, wc = st.wc;
    var out = [];
    var notes = [];

    if (st.scene === 'am' || st.scene === 'demod') {
      var R = FT.PROP.modulate.apply(L, { w0: w0 });
      out.push({ title: '基带信号 s(t)', kind: 'time', layer: L });
      out.push({ title: '基带频谱 S(jω)', kind: 'mag', layer: L });
      out.push({ title: '已调信号 r(t)=s(t)·cos ω₀t（虚线为包络 ±s(t)）', kind: 'time', layer: R, envelope: L });
      out.push({ title: '已调频谱 R(jω) = ½S[j(ω−ω₀)] + ½S[j(ω+ω₀)]', kind: 'mag', layer: R });

      if (st.scene === 'demod') {
        var D = FT.PROP.modulate.apply(R, { w0: w0 });
        var F = lpf(D, wc);
        var Fs = scaled(F, 2);
        out.push({ title: '相干解调 r(t)·cos ω₀t 的频谱：½S + ¼S(±2ω₀)', kind: 'mag', layer: D, lpfAt: wc });
        out.push({ title: '低通滤波后 ×2 恢复：与 s(t) 对比（灰）', kind: 'time', layer: Fs, ghost: L });
        notes.push({ cls: 'key', text: '解调后再乘一次 cos ω₀t：频谱被复制成 4 份 —— 中间 ½S(jω) 是原谱，±2ω₀ 处各有一份 ¼S(jω) 的高频残留，用低通滤掉即可。' });
        notes.push({ cls: 'tip', text: '恢复结果整体是原来的 ½，所以乘 2 补偿。低通截止 wc 必须大于基带带宽、又小于 2ω₀ 减去基带带宽，否则要么滤不干净、要么把有用信号切掉。' });
      } else {
        notes.push({ cls: 'key', text: '相乘性质：x₁(t)x₂(t) ⟷ (1/2π)X₁(jω)*X₂(jω)。这里 x₂=cos ω₀t，其频谱是 π[δ(ω−ω₀)+δ(ω+ω₀)]，卷积只是把 S 搬过去，系数 (1/2π)·π = ½。' });
        notes.push({ cls: 'warn', text: '载波频率必须高于基带最高频率，否则正负搬移的两份会重叠 —— 那就是频谱混叠，解调时无法分开。把 ω₀ 调小可以亲眼看到。' });
      }
    }

    if (st.scene === 'bpf') {
      var up = FT.PROP.freqshift.apply(L, { w0: -w0 });
      var fl = lpf(up, wc);
      var dn = FT.PROP.freqshift.apply(fl, { w0: w0 });
      out.push({ title: '输入 x(t)', kind: 'time', layer: L });
      out.push({ title: '输入频谱 X(jω)', kind: 'mag', layer: L });
      out.push({ title: '① 乘 e^{−jω₀t}：把 ω₀ 附近搬到原点', kind: 'mag', layer: up });
      out.push({ title: '② 低通 |ω|<ωc 取出想要的频段', kind: 'mag', layer: fl, lpfAt: wc });
      out.push({ title: '③ 乘 e^{+jω₀t} 搬回去 = 中心频率可调的带通', kind: 'mag', layer: dn });
      out.push({ title: '输出 y(t)（灰为输入）', kind: 'time', layer: dn, ghost: L });
      notes.push({ cls: 'key', text: '课件 slide 60 的思路：用移频把感兴趣的频段搬到原点，过一个固定低通，再搬回去。等效中心频率 ω₀、带宽 2ωc 的可调带通 —— 硬件上这就是超外差接收机的雏形。' });
      notes.push({ cls: 'warn', text: '搬回原点再滤波会产生振铃（理想低通的非因果性），输出波形两侧出现 sinc 纹波是正常现象。' });
    }

    if (st.scene === 'alias') {
      var R2 = FT.PROP.modulate.apply(L, { w0: w0 });
      var D2 = FT.PROP.modulate.apply(R2, { w0: w0 });
      var F2 = lpf(D2, wc);
      out.push({ title: 'S(jω)：基带频谱', kind: 'mag', layer: L });
      out.push({ title: 'R(jω)：搬移到 ±ω₀ 的两份', kind: 'mag', layer: R2 });
      out.push({ title: '解调后 r(t)·cos ω₀t：中心 + ±2ω₀', kind: 'mag', layer: D2 });
      out.push({ title: '低通输出（灰为原信号）', kind: 'time', layer: F2, ghost: L });
      notes.push({ cls: 'warn', text: '把 ω₀ 从大往小拖：两份搬移的频谱先是分开、然后相交、最后完全重叠。重叠之后无论怎么滤波都恢复不出原信号 —— 这就是「载波频率必须高于信号带宽」的几何意义。' });
    }

    return { panels: out, notes: notes };
  }

  /* --------------------------------------------------------------- 绘制 */
  function renderScene() {
    var sc = buildScene();
    UI.clear(host);
    charts = [];

    var grid = null;
    sc.panels.forEach(function (pn, idx) {
      if (idx % 2 === 0) { grid = UI.el('div', { class: 'mod-charts-row' }); host.appendChild(grid); }
      var card = UI.el('div', { class: 'chart-card' });
      var head = UI.el('div', { class: 'chart-head' });
      head.appendChild(UI.el('div', { class: 'chart-title' }, [
        UI.el('span', { class: 'dot ' + (pn.kind === 'time' ? 'dot-x' : pn.kind === 'mag' ? 'dot-mag' : 'dot-phase') }),
        document.createTextNode(pn.title)
      ]));
      card.appendChild(head);
      var box = UI.el('div', { class: 'canvas-box', style: 'height:176px' });
      var cv = UI.el('canvas');
      var ro = UI.el('div', { class: 'chart-readout' });
      box.appendChild(cv); box.appendChild(ro);
      card.appendChild(box);
      grid.appendChild(card);

      var ch = new Chart(cv, ro, {
        xlabel: pn.kind === 'time' ? 't' : 'ω',
        xLabel: pn.kind === 'time' ? 't' : 'ω',
        piTicks: pn.kind !== 'time',
        padL: 48
      });
      charts.push(ch);

      var opts = {
        tmin: -st.tmax, tmax: st.tmax, Nt: NT,
        wmin: -st.wmax, wmax: st.wmax, Nw: NW, wmaxAbs: st.wmax,
        reconstructTime: !!(pn.layer.meta && pn.layer.meta.reconstruct)
      };
      var r = FT.render(pn.layer, opts);
      var n = r.w.length;
      var mag = new Float64Array(n), ph = new Float64Array(n);
      var mx = 0;
      for (var i = 0; i < n; i++) {
        var m = Math.hypot(r.Xre[i], r.Xim[i]);
        mag[i] = m; if (m > mx) mx = m;
        ph[i] = m < 1e-9 ? NaN : Math.atan2(r.Xim[i], r.Xre[i]);
      }
      var series = [], imps = [];
      if (pn.kind === 'time') {
        if (pn.ghost) {
          var g = FT.render(pn.ghost, { tmin: -st.tmax, tmax: st.tmax, Nt: NT, wmin: -st.wmax, wmax: st.wmax, Nw: 8, wmaxAbs: st.wmax, reconstructTime: false });
          series.push({ x: g.t, y: g.xre, color: C.ghost, width: 1.4, dash: [5, 4], label: '原' });
        }
        series.push({ x: r.t, y: r.xre, color: C.x, width: 2, label: 'Re' });
        if (pn.envelope) {
          var e = FT.render(pn.envelope, { tmin: -st.tmax, tmax: st.tmax, Nt: NT, wmin: -st.wmax, wmax: st.wmax, Nw: 8, wmaxAbs: st.wmax, reconstructTime: false });
          series.push({ x: e.t, y: e.xre, color: C.y, width: 1.2, dash: [3, 3], alpha: .85, label: '+s' });
          var neg = new Float64Array(e.xre.length);
          for (var q = 0; q < neg.length; q++) neg[q] = -e.xre[q];
          series.push({ x: e.t, y: neg, color: C.y, width: 1.2, dash: [3, 3], alpha: .85, label: '−s' });
        }
        ch.setDomain(-st.tmax, st.tmax);
        r.timp.forEach(function (tp) { imps.push({ x: tp.t, y: Math.hypot(tp.re, tp.im), color: C.x, label: tp.order ? 'δ′' : '1' }); });
      } else if (pn.kind === 'mag') {
        series.push({ x: r.w, y: mag, color: C.mag, width: 2, fill: C.fillMag, label: '|X|' });
        r.wimp.forEach(function (q) { imps.push({ x: q.w, y: Math.hypot(q.re, q.im), color: C.mag, label: UI.trim(Math.hypot(q.re, q.im)) }); });
        ch.setDomain(-st.wmax, st.wmax);
        if (pn.lpfAt) {
          ch.setVLine([{ x: pn.lpfAt, color: C.y, label: 'ωc', dash: [4, 3] }, { x: -pn.lpfAt, color: C.y, dash: [4, 3] }]);
        } else ch.setVLine([]);
      } else {
        series.push({ x: r.w, y: ph, color: C.phase, width: 2, label: '∠X' });
        ch.setDomain(-st.wmax, st.wmax);
        ch.setVLine([]);
      }
      ch.setSeries(series);
      ch.setImpulses(imps);
      if (pn.kind !== 'mag') ch.setVLine([]);
      ch.draw();
    });

    var noteBox = document.getElementById('modNote');
    noteBox.innerHTML = sc.notes.map(function (x) { return '<span class="note ' + x.cls + '">' + x.text + '</span>'; }).join('');

    var alias = document.getElementById('modAliasWarn').checked;
    if (alias) {
      var bw = bandwidthOf();
      if (st.w0 <= bw) {
        noteBox.innerHTML += '<span class="note warn" style="display:block">⚠ 当前 ω₀ = ' + UI.trim(st.w0) +
          ' rad/s ≤ 基带带宽 ≈ ' + UI.trim(bw) + ' rad/s，两份搬移的频谱已经重叠，无法无失真解调。</span>';
      }
    }
  }

  function bandwidthOf() {
    var p = st.baseParams;
    if (st.base === 'gate') return PI / (p.T1 || 1);
    if (st.base === 'tri') return 2 * PI / (p.tau || 1);
    if (st.base === 'exp1s') return 4 * (p.a || 1);
    if (st.base === 'sincW') return p.W || 1;
    return 4;
  }

  /* --------------------------------------------------------------- 界面 */
  var SCENES = [
    { id: 'am', name: '正弦幅度调制', desc: 's(t)·cos ω₀t ⟷ ½S[j(ω−ω₀)]+½S[j(ω+ω₀)]' },
    { id: 'demod', name: '同步（相干）解调', desc: '再乘 cos ω₀t，然后低通滤波恢复基带' },
    { id: 'bpf', name: '中心频率可调带通', desc: '移频 → 低通 → 移回：课件 slide 60 的测试题' },
    { id: 'alias', name: '搬移量过小 → 混叠', desc: 'ω₀ 小于基带带宽时会发生什么' }
  ];

  function renderControls() {
    var chips = document.getElementById('modSceneChips');
    UI.clear(chips);
    SCENES.forEach(function (s) {
      var c = UI.chip(s.name, s.desc, st.scene === s.id, function () {
        st.scene = s.id; renderControls(); renderScene();
      });
      c.classList.add('chip-wide');
      chips.appendChild(c);
    });

    var ps = document.getElementById('modParams');
    UI.clear(ps);
    var baseSel = UI.el('select', {
      onchange: function () {
        st.base = baseSel.value;
        var s = FT.getSignal(st.base);
        st.baseParams = FT.defaultParams(s);
        renderControls(); renderScene();
      }
    });
    [['gate', '门脉冲（矩形基带）'], ['tri', '三角脉冲'], ['exp1s', '单边指数'], ['sincW', 'Sa 型（带限基带）']].forEach(function (o) {
      baseSel.appendChild(UI.el('option', { value: o[0], text: o[1], selected: st.base === o[0] }));
    });
    var fld = UI.el('div', { class: 'field' });
    fld.appendChild(UI.el('label', { text: '基带信号 s(t)' }));
    fld.appendChild(baseSel);
    ps.appendChild(fld);

    var s = FT.getSignal(st.base);
    (s.params || []).forEach(function (d) {
      ps.appendChild(UI.sliderRow(d, st.baseParams[d.key], function (v) { st.baseParams[d.key] = v; renderScene(); }));
    });
    ps.appendChild(UI.sliderRow({ key: 'w0', label: '\\omega_{0}', min: 0.5, max: 16, step: 0.1, def: 6, desc: '载波角频率' },
      st.w0, function (v) { st.w0 = v; renderScene(); }));
    ps.appendChild(UI.sliderRow({ key: 'wc', label: '\\omega_{c}', min: 0.5, max: 16, step: 0.1, def: 4, desc: '低通截止' },
      st.wc, function (v) { st.wc = v; renderScene(); }));
    ps.appendChild(UI.sliderRow({ key: 'wmax', label: '\\omega_{max}', min: 8, max: 60, step: 1, def: 24, desc: '显示范围' },
      st.wmax, function (v) { st.wmax = v; renderScene(); }));

    document.getElementById('modLpf').addEventListener('change', renderScene);
    document.getElementById('modAliasWarn').addEventListener('change', renderScene);

    var f = document.getElementById('modFormula');
    f.innerHTML = 'x₁(t)x₂(t)  (1/2π)[X₁(jω)*X₂(jω)]' +
      '<div style="margin-top:8px">cos(ω₀t)  π[δ(ω-ω₀)+δ(ω+ω₀)]</div>' +
      '<div style="margin-top:8px">r(t)=s(t)cos(ω₀t)  (1/2)S[j(ω-ω₀)]+(1/2)S[j(ω+ω₀)]</div>';
  }

  Mod.init = function () {
    if (host) return;
    host = document.getElementById('modCharts');
    renderControls();
    renderScene();
  };

})(window);
