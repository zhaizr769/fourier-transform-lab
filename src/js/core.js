/* ==========================================================================
   core.js —— 复数运算、傅里叶层（Layer）、数值正反变换、表达式解析
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT = {};
  var PI = Math.PI, TAU = 2 * Math.PI;

  /* ---------------------------------------------------------------- 复数 */
  FT.C = function (re, im) { return { re: re || 0, im: im || 0 }; };
  FT.cadd = function (a, b) { return { re: a.re + b.re, im: a.im + b.im }; };
  FT.cneg = function (a) { return { re: -a.re, im: -a.im }; };
  FT.cconj = function (a) { return { re: a.re, im: -a.im }; };
  FT.cmul = function (a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; };
  FT.cdiv = function (a, b) {
    var d = b.re * b.re + b.im * b.im;
    if (!d) return { re: 0, im: 0 };
    return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
  };
  FT.cabs = function (a) { return Math.hypot(a.re, a.im); };
  FT.carg = function (a) { return Math.atan2(a.im, a.re); };
  FT.cexp = function (theta) { return { re: Math.cos(theta), im: Math.sin(theta) }; };

  /* 就地乘法：out = a * b，a/b/out 均为 [re,im] 数组 */
  function mulInto(a, b, out) {
    var ar = a[0], ai = a[1], br = b[0], bi = b[1];
    out[0] = ar * br - ai * bi;
    out[1] = ar * bi + ai * br;
    return out;
  }
  FT.mulInto = mulInto;

  /* ---------------------------------------------------------------- 网格 */
  function linspace(a, b, n) {
    var g = new Float64Array(n), h = (b - a) / (n - 1);
    for (var i = 0; i < n; i++) g[i] = a + i * h;
    return g;
  }
  FT.linspace = linspace;

  /* ------------------------------------------------- Layer：一层信号状态
     xfn(t, out)   时域正则部分（复数）
     Xfn(w, out)   频域正则部分（复数）
     timp          [{t, re, im}]  时域冲激
     wimp(W)       [{w, re, im}]  频域冲激（|w|<=W）
     meta          {name, formulaT, formulaX, notes, flags}
  ------------------------------------------------------------------ */
  FT.makeLayer = function (xfn, Xfn, timp, wimp, meta) {
    return {
      xfn: xfn,
      Xfn: Xfn,
      timp: timp || [],
      wimp: wimp || function () { return []; },
      meta: meta || {},
      /* 完整频谱（正则 + 时域冲激的贡献）。order>=1 表示冲激偶：δ'(t-t0) ⟷ jω e^{-jωt0} */
      Xfull: function (w, out) {
        this.Xfn(w, out);
        var tp = this.timp || [];
        for (var i = 0; i < tp.length; i++) {
          var p = tp[i], ord = p.order || 0;
          var c = Math.cos(-w * p.t), s = Math.sin(-w * p.t);
          var pr = p.re * c - p.im * s, pi = p.re * s + p.im * c;
          for (var q = 0; q < ord; q++) {
            /* 乘一次 jω */
            var nr = -pi * w, ni = pr * w;
            pr = nr; pi = ni;
          }
          out[0] += pr; out[1] += pi;
        }
        return out;
      }
    };
  };

  /* 计算某层的 X(0)（含冲激贡献，用于积分特性的 πX(0)δ(ω) 项） */
  FT.Xat0 = function (layer) {
    var o = [0, 0];
    layer.Xfull(0, o);
    var imps = layer.wimp(1e-9);
    for (var i = 0; i < imps.length; i++) if (Math.abs(imps[i].w) < 1e-9) o[0] += imps[i].re, o[1] += imps[i].im;
    return { re: o[0], im: o[1] };
  };

  /* ---------------------------------------------------- 数值反傅里叶变换
     x(t) = (1/2π) ∫ X(ω) e^{jωt} dω   —— 用 e^{jω_k t} 的递推避免逐点三角函数
  -------------------------------------------------------------------- */
  FT.inverseFT = function (Xre, Xim, w, t) {
    var Nw = w.length, Nt = t.length;
    var re = new Float64Array(Nt), im = new Float64Array(Nt);
    if (Nw < 2) return { re: re, im: im };
    var dw = w[1] - w[0];
    for (var n = 0; n < Nt; n++) {
      var tn = t[n];
      var step = Math.cos(dw * tn), stepI = Math.sin(dw * tn);
      /* 起点 e^{j w[0] t} */
      var cr = Math.cos(w[0] * tn), ci = Math.sin(w[0] * tn);
      var sr = 0, si = 0;
      for (var k = 0; k < Nw; k++) {
        var xk = Xre[k] * cr - Xim[k] * ci;
        var yk = Xre[k] * ci + Xim[k] * cr;
        sr += xk; si += yk;
        var ncr = cr * step - ci * stepI;
        ci = cr * stepI + ci * step;
        cr = ncr;
        /* 每 256 步重新归一化，抑制递推漂移 */
        if ((k & 255) === 255) {
          var m = 1 / Math.hypot(cr, ci);
          cr *= m; ci *= m;
        }
      }
      re[n] = sr * dw / TAU;
      im[n] = si * dw / TAU;
    }
    return { re: re, im: im };
  };

  /* ---------------------------------------------------- 数值正傅里叶变换
     X(ω) = ∫ x(t) e^{-jωt} dt
  -------------------------------------------------------------------- */
  FT.forwardFT = function (xre, xim, t, w) {
    var Nt = t.length, Nw = w.length;
    var re = new Float64Array(Nw), im = new Float64Array(Nw);
    if (Nt < 2) return { re: re, im: im };
    var dt = t[1] - t[0];
    for (var k = 0; k < Nw; k++) {
      var wk = w[k];
      var step = Math.cos(-wk * dt), stepI = Math.sin(-wk * dt);
      var cr = Math.cos(-wk * t[0]), ci = Math.sin(-wk * t[0]);
      var sr = 0, si = 0;
      for (var n = 0; n < Nt; n++) {
        sr += xre[n] * cr - xim[n] * ci;
        si += xre[n] * ci + xim[n] * cr;
        var ncr = cr * step - ci * stepI;
        ci = cr * stepI + ci * step;
        cr = ncr;
        if ((n & 255) === 255) { var m = 1 / Math.hypot(cr, ci); cr *= m; ci *= m; }
      }
      re[k] = sr * dt;
      im[k] = si * dt;
    }
    return { re: re, im: im };
  };

  /* 在网格上求值一个复函数 */
  FT.evalComplex = function (fn, grid) {
    var n = grid.length, re = new Float64Array(n), im = new Float64Array(n), o = [0, 0];
    for (var i = 0; i < n; i++) {
      fn(grid[i], o);
      var a = o[0], b = o[1];
      re[i] = isFinite(a) ? a : 0;
      im[i] = isFinite(b) ? b : 0;
    }
    return { re: re, im: im };
  };

  /* 反变换（含冲激谱线贡献）：x(t) = (1/2π)∫X e^{jωt}dω + (1/2π)Σ c_k e^{jω_k t} */
  FT.inverseWithImpulses = function (Xre, Xim, w, wimp, t) {
    var inv = FT.inverseFT(Xre, Xim, w, t);
    var re = inv.re, im = inv.im;
    var list = (wimp && wimp.length) ? wimp.slice(0, 400) : [];
    for (var q = 0; q < list.length; q++) {
      var wq = list[q].w, cr = list[q].re, ci = list[q].im;
      for (var n = 0; n < t.length; n++) {
        var c = Math.cos(wq * t[n]), s = Math.sin(wq * t[n]);
        re[n] += (cr * c - ci * s) / TAU;
        im[n] += (cr * s + ci * c) / TAU;
      }
    }
    return { re: re, im: im };
  };

  /* ---------------------------------------------------------- 采样渲染 */
  /* 把一个 Layer 采样成绘图数据。
     opts: {tmin,tmax,Nt, wmin,wmax,Nw, reconstructTime}
  ------------------------------------------------------------------ */
  FT.render = function (layer, opts) {
    var t = linspace(opts.tmin, opts.tmax, opts.Nt);
    var w = linspace(opts.wmin, opts.wmax, opts.Nw);
    var X = FT.evalComplex(function (x, o) { layer.Xfull(x, o); }, w);
    var imps = layer.wimp(opts.wmaxAbs || Math.max(-opts.wmin, opts.wmax));
    imps = imps.filter(function (q) { return Math.abs(q.w) <= Math.max(-opts.wmin, opts.wmax); });
    var xt, xi;
    if (opts.reconstructTime) {
      var inv = FT.inverseWithImpulses(X.re, X.im, w, imps, t);
      xt = inv.re; xi = inv.im;
    } else {
      var xx = FT.evalComplex(function (x, o) { layer.xfn(x, o); }, t);
      xt = xx.re; xi = xx.im;
    }
    var out = {
      t: t, xre: xt, xim: xi,
      w: w, Xre: X.re, Xim: X.im,
      timp: layer.timp.slice(),
      wimp: imps,
      meta: layer.meta,
      reconstructed: !!opts.reconstructTime
    };
    /* 时域冲激落在窗口内的才画 */
    out.timp = out.timp.filter(function (p) { return p.t >= opts.tmin && p.t <= opts.tmax; });
    return out;
  };

  /* -------------------------------------------------------- 数值小工具 */
  FT.niceTicks = function (min, max, count) {
    count = count || 6;
    var span = max - min;
    if (!(span > 0)) return { ticks: [min], step: 1 };
    var raw = span / count;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    var start = Math.ceil(min / step) * step;
    var ticks = [];
    for (var v = start; v <= max + step * 1e-6; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return { ticks: ticks, step: step };
  };

  FT.fmt = function (v, d) {
    if (v === undefined || v === null || !isFinite(v)) return '—';
    d = d === undefined ? 3 : d;
    var a = Math.abs(v);
    if (a !== 0 && (a < 1e-4 || a >= 1e6)) return v.toExponential(2);
    var s = v.toFixed(d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s === '-0' ? '0' : s;
  };

  /* π 刻度标签：把 v 表示成 k·π 的形式 */
  FT.fmtPi = function (v, step) {
    if (Math.abs(v) < 1e-12) return '0';
    var k = v / PI;
    var ks = Math.abs(k - Math.round(k * 4) / 4) < Math.abs(step) / PI * 0.05 ? Math.round(k * 4) / 4 : k;
    if (Math.abs(ks - Math.round(ks)) < 1e-9) {
      var n = Math.round(ks);
      if (n === 1) return 'π';
      if (n === -1) return '−π';
      return n + 'π';
    }
    var num = Math.round(ks * 4), den = 4;
    var g = gcd(Math.abs(num), den); num /= g; den /= g;
    if (den === 1) return (num === 1 ? 'π' : num === -1 ? '−π' : num + 'π');
    return (num === 1 ? '' : num === -1 ? '−' : num) + 'π/' + den;
  };

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  /* ------------------------------------------------- 表达式解析（自定义信号）
     递归下降：expr := term (('+'|'-') term)*
  -------------------------------------------------------------------- */
  var FUNCS = {
    exp: Math.exp, ln: Math.log, log: function (x) { return Math.log10(x); }, log10: Math.log10,
    log2: function (x) { return Math.log2(x); },
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    sqrt: Math.sqrt, abs: Math.abs, sign: function (x) { return x > 0 ? 1 : x < 0 ? -1 : 0; },
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    /* 常用信号 */
    u: function (x) { return x >= 0 ? 1 : 0; },
    step: function (x) { return x >= 0 ? 1 : 0; },
    heaviside: function (x) { return x >= 0 ? 1 : 0; },
    sgn: function (x) { return x > 0 ? 1 : x < 0 ? -1 : 0; },
    rect: function (x) { return Math.abs(x) < 0.5 ? 1 : (Math.abs(x) === 0.5 ? 0.5 : 0); },
    gate: function (x) { return Math.abs(x) < 0.5 ? 1 : (Math.abs(x) === 0.5 ? 0.5 : 0); },
    Pi: function (x) { return Math.abs(x) < 0.5 ? 1 : 0; },
    tri: function (x) { var a = Math.abs(x); return a < 1 ? 1 - a : 0; },
    Lambda: function (x) { var a = Math.abs(x); return a < 1 ? 1 - a : 0; },
    sa: function (x) { return x === 0 ? 1 : Math.sin(x) / x; },
    sinc: function (x) { return x === 0 ? 1 : Math.sin(PI * x) / (PI * x); },
    sinhc: function (x) { return x === 0 ? 1 : Math.sin(x) / x; }
  };

  FT.compile = function (src) {
    var i = 0, s = String(src);
    function err(m) { throw new Error(m + '（位置 ' + i + '）'); }
    function skip() { while (i < s.length && /\s/.test(s[i])) i++; }
    function peek() { skip(); return s[i] || ''; }
    function startsWith(w) { return s.slice(i, i + w.length).toLowerCase() === w; }

    function parseExpr() {
      var v = parseTerm();
      for (;;) {
        skip();
        var c = s[i];
        if (c === '+') { i++; var a = parseTerm(); v = { t: '+', a: v, b: a }; }
        else if (c === '-') { i++; var b = parseTerm(); v = { t: '-', a: v, b: b }; }
        else break;
      }
      return v;
    }
    function parseTerm() {
      var v = parseUnary();
      for (;;) {
        skip();
        var c = s[i];
        if (c === '*') { i++; v = { t: '*', a: v, b: parseUnary() }; }
        else if (c === '/') { i++; v = { t: '/', a: v, b: parseUnary() }; }
        else if (c === '^') { i++; v = { t: '^', a: v, b: parseUnary() }; }
        else if (c && (/[a-zA-Z(]/.test(c)) && !isExplicitOp(v)) {
          /* 隐式乘法：2t、3sin(t)、2(t+1) */
          v = { t: '*', a: v, b: parseUnary() };
        } else break;
      }
      return v;
    }
    function isExplicitOp(v) { return v.t === 'num' || v.t === 'var' || v.t === 'call' || v.t === 'paren'; }
    function parseUnary() {
      skip();
      if (s[i] === '-') { i++; return { t: 'neg', a: parseUnary() }; }
      if (s[i] === '+') { i++; return parseUnary(); }
      return parseAtom();
    }
    function parseAtom() {
      skip();
      var c = s[i];
      if (!c) err('表达式意外结束');
      if (c === '(') {
        i++;
        var e = parseExpr();
        skip();
        if (s[i] !== ')') err('缺少右括号');
        i++;
        return { t: 'paren', a: e };
      }
      if (c === '|') {
        i++;
        var inner = parseExpr();
        skip();
        if (s[i] !== '|') err('绝对值缺少右竖线');
        i++;
        return { t: 'call', name: 'abs', args: [inner] };
      }
      if (/[0-9.]/.test(c)) {
        var m = /^[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/i.exec(s.slice(i));
        if (!m) err('数字格式错误');
        i += m[0].length;
        return { t: 'num', v: parseFloat(m[0]) };
      }
      if (/[a-zA-Z_]/.test(c)) {
        var nm = /^[a-zA-Z_][a-zA-Z_0-9]*/.exec(s.slice(i))[0];
        i += nm.length;
        var low = nm.toLowerCase();
        if (low === 'pi') return { t: 'num', v: PI };
        if (low === 'e' && peek() !== '^' && !/^[a-z]/i.test(s[i] || '')) return { t: 'num', v: Math.E };
        if (low === 'j') return { t: 'var', name: '__j' };
        skip();
        if (s[i] === '(') {
          var fn = FUNCS[low];
          if (!fn) err('未知函数 ' + nm);
          i++;
          var args = [];
          skip();
          if (s[i] !== ')') {
            for (;;) {
              args.push(parseExpr());
              skip();
              if (s[i] === ',') { i++; continue; }
              break;
            }
          }
          skip();
          if (s[i] !== ')') err('函数 ' + nm + ' 缺少右括号');
          i++;
          return { t: 'call', name: low, args: args };
        }
        if (low === 'exp') err('exp 需要括号：exp(...)');
        return { t: 'var', name: low };
      }
      err('无法解析的字符 "' + c + '"');
    }

    var ast = parseExpr();
    skip();
    if (i < s.length) err('多余内容 "' + s[i] + '"');

    var CMPL = { abs: 1, exp: 0, sqrt: 1 };
    return function evaluate(env) {
      function ev(n) {
        switch (n.t) {
          case 'num': return { re: n.v, im: 0 };
          case 'var':
            if (n.name === 't') { var tv = env.t; return { re: typeof tv === 'number' ? tv : 0, im: typeof tv === 'undefined' ? 0 : (tv.im || 0) }; }
            if (n.name === '__j') return { re: 0, im: 1 };
            if (n.name === 'jw') return { re: 0, im: env.t || 0 };
            var p = env.p && env.p[n.name];
            if (p === undefined) throw new Error('未知变量 ' + n.name);
            return { re: p, im: 0 };
          case 'neg': { var a = ev(n.a); return { re: -a.re, im: -a.im }; }
          case 'paren': return ev(n.a);
          case '+': { var x = ev(n.a), y = ev(n.b); return { re: x.re + y.re, im: x.im + y.im }; }
          case '-': { var x2 = ev(n.a), y2 = ev(n.b); return { re: x2.re - y2.re, im: x2.im - y2.im }; }
          case '*': { var x3 = ev(n.a), y3 = ev(n.b); return { re: x3.re * y3.re - x3.im * y3.im, im: x3.re * y3.im + x3.im * y3.re }; }
          case '/': { var x4 = ev(n.a), y4 = ev(n.b); var d = y4.re * y4.re + y4.im * y4.im; if (!d) return { re: 0, im: 0 }; return { re: (x4.re * y4.re + x4.im * y4.im) / d, im: (x4.im * y4.re - x4.re * y4.im) / d }; }
          case '^': {
            var base = ev(n.a), ex = ev(n.b);
            if (Math.abs(base.im) < 1e-12 && Math.abs(ex.im) < 1e-12) {
              var v = Math.pow(base.re, ex.re);
              if (!isFinite(v) && base.re < 0) v = 0;
              return { re: isFinite(v) ? v : 0, im: 0 };
            }
            var r = Math.hypot(base.re, base.im), th = Math.atan2(base.im, base.re);
            var mr = Math.pow(r, ex.re), mt = ex.re * th;
            if (Math.abs(ex.im) > 1e-12) { mr *= Math.exp(-ex.im * th); mt += ex.im * Math.log(r || 1e-300); }
            if (!isFinite(mr)) return { re: 0, im: 0 };
            return { re: mr * Math.cos(mt), im: mr * Math.sin(mt) };
          }
          case 'call': {
            var f = FUNCS[n.name];
            var arg = ev(n.args[0]);
            if (Math.abs(arg.im) < 1e-12) {
              var rv = f(arg.re);
              if (!isFinite(rv)) return { re: 0, im: 0 };
              return { re: rv, im: 0 };
            }
            if (n.name === 'exp') {
              var er = Math.exp(arg.re);
              if (!isFinite(er)) return { re: 0, im: 0 };
              return { re: er * Math.cos(arg.im), im: er * Math.sin(arg.im) };
            }
            if (n.name === 'sin' || n.name === 'cos') {
              var a = Math.sin(arg.re), b = Math.cos(arg.re), sh = Math.sinh(arg.im), ch = Math.cosh(arg.im);
              return n.name === 'sin' ? { re: a * ch, im: b * sh } : { re: b * ch, im: -a * sh };
            }
            return { re: f(arg.re) || 0, im: 0 };
          }
        }
        throw new Error('内部错误');
      }
      return ev(ast);
    };
  };

  /* 从表达式里找出用到的自由变量，方便生成参数滑块 */
  FT.freeVars = function (src) {
    var out = {}, m, re = /[a-zA-Z_][a-zA-Z_0-9]*/g;
    var reserved = {};
    Object.keys(FUNCS).forEach(function (k) { reserved[k.toLowerCase()] = 1; });
    ['pi', 'e', 't', 'j', 'jw', 'i'].forEach(function (k) { reserved[k] = 1; });
    while ((m = re.exec(String(src)))) {
      var low = m[0].toLowerCase();
      if (!reserved[low]) out[low] = 1;
    }
    return Object.keys(out);
  };

  FT.FUNCS = FUNCS;

})(window);
