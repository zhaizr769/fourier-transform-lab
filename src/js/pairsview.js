/* ==========================================================================
   pairsview.js —— 表 4.2 基本变换对速查表（含实时缩略图）
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML, C = FT.COLORS;
  var body, kindFilter = 'all', showSpark = true;

  var ORDER_NOTE = [
    '表 4.2 第一行是总纲：周期信号的傅里叶变换 = 2πΣ a_k δ(ω−kω₀)，也就是把非周期频谱在谐波频率上取样。'
  ];

  function sparkline(r, kind) {
    var d = r.derived;
    var spec = kind === 'time'
      ? { xmin: r.t[0], xmax: r.t[r.t.length - 1], series: [{ x: r.t, y: r.xre, color: C.x, width: 1.5 }] }
      : {
        xmin: r.w[0], xmax: r.w[r.w.length - 1],
        series: [{ x: r.w, y: d.mag, color: C.mag, width: 1.5 }],
        impulses: r.wimp.map(function (q) { return { x: q.w, y: Math.hypot(q.re, q.im), color: C.mag }; })
      };
    return spec;
  }

  function quick(r) {
    var n = r.w.length, mag = new Float64Array(n), ph = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      mag[i] = Math.hypot(r.Xre[i], r.Xim[i]);
      ph[i] = mag[i] < 1e-9 ? NaN : Math.atan2(r.Xim[i], r.Xre[i]);
    }
    return { mag: mag, ph: ph };
  }

  function row(sig) {
    var tr = UI.el('tr');
    var tdT = UI.el('td');
    var btn = UI.el('button', { class: 'siglink', title: '点我在实验台打开', text: '' });
    btn.innerHTML = UI.renderMath(sig.formulaT);
    btn.addEventListener('click', function () {
      FT.Lab.pick(sig.id);
      FT.UI.go('lab');
      UI.toast('已在实验台打开：' + sig.name);
    });
    tdT.appendChild(btn);
    tdT.appendChild(UI.el('div', { class: 'tagline', text: sig.name }));
    tr.appendChild(tdT);

    var tdX = UI.el('td');
    tdX.innerHTML = UI.renderMath(sig.formulaX);
    tr.appendChild(tdX);

    var tdA = UI.el('td');
    tdA.innerHTML = sig.formulaA ? UI.renderMath(sig.formulaA) : '<span class="hint">—</span>';
    tr.appendChild(tdA);

    if (showSpark) {
      ['time', 'mag'].forEach(function (kind) {
        var td = UI.el('td', { class: 'spark' });
        var cv = UI.el('canvas');
        td.appendChild(cv);
        tr.appendChild(td);
        requestAnimationFrame(function () {
          var s = FT.getSignal(sig.id);
          var p = FT.defaultParams(s);
          var L = FT.buildBaseLayer(s, p);
          if (!L) return;
          var wm = Math.min(60, (s.window ? s.window.wmax : 20));
          var tm = Math.min(30, (s.window ? s.window.tmax : 10));
          var r = FT.render(L, { tmin: -tm, tmax: tm, Nt: 200, wmin: -wm, wmax: wm, Nw: 260, wmaxAbs: wm, reconstructTime: false });
          r.derived = quick(r);
          FT.miniDraw(cv, sparkline(r, kind));
        });
      });
    }
    return tr;
  }

  FT.PairsView = {
    render: function () {
      body = body || document.getElementById('pairsBody');
      UI.clear(body);
      var list = FT.signalList().filter(function (s) { return s.id !== 'custom'; });
      if (kindFilter === 'energy') list = list.filter(function (s) { return s.kind === 'energy'; });
      if (kindFilter === 'power') list = list.filter(function (s) { return s.kind === 'power'; });
      if (kindFilter === 'dist') list = list.filter(function (s) { return s.kind === 'dist'; });

      /* 总纲行 */
      var head = UI.el('tr');
      ['Σ_{k=-∞}^{+∞} a_k e^{jkω₀t}',
       '2π Σ_{k=-∞}^{+∞} a_k δ(ω-kω₀)',
       'a_k'].map(function (f) {
        var td = UI.el('td');
        td.innerHTML = UI.renderMath(f);
        head.appendChild(td);
      });
      if (showSpark) { head.appendChild(UI.el('td')); head.appendChild(UI.el('td')); }
      body.appendChild(head);

      list.forEach(function (s) { body.appendChild(row(s)); });

      var note = UI.el('tr');
      var nc = UI.el('td', { colspan: showSpark ? 5 : 3 });
      nc.style.color = '#5b6a82';
      nc.style.fontSize = '12.4px';
      nc.textContent = '说明：表 4.2 第一行是总纲 —— 周期信号的傅里叶变换等于 2πΣ a_k δ(ω−kω₀)，也就是把对应非周期信号的频谱在谐波频率上取样。' +
        '带参数的变换对点信号名即可在实验台里拖动滑块；「—」表示该信号不是周期的，没有傅里叶级数系数。';
      note.appendChild(nc);
      body.appendChild(note);
    },
    setFilter: function (k) { kindFilter = k; FT.PairsView.render(); },
    setSpark: function (v) { showSpark = v; FT.PairsView.render(); }
  };

})(window);
