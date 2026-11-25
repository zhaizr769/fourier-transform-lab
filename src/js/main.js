/* ==========================================================================
   main.js —— 入口：模式切换、抽屉/模态、公式速查、自定义信号面板、使用说明
   ========================================================================== */
(function (global) {
  'use strict';

  var FT = global.FT, UI = global.UI, M = global.MML;

  /* ----------------------------------------------------------- 模式切换 */
  UI.go = function (mode) {
    var btns = document.querySelectorAll('#modeSwitch .mode-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('active', btns[i].dataset.mode === mode);
    var views = document.querySelectorAll('.view');
    for (var j = 0; j < views.length; j++) views[j].classList.toggle('active', views[j].id === 'view-' + mode);
    if (mode === 'props') FT.PropsView && FT.PropsView.render();
    if (mode === 'pairs') FT.PairsView && FT.PairsView.render();
    if (mode === 'sys') FT.Sys && FT.Sys.init();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  FT.UI = UI;  // 性质表/变换对里的「载入实验台」按钮走 FT.UI.go

  document.getElementById('modeSwitch').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mode]');
    if (b) UI.go(b.dataset.mode);
  });

  /* -------------------------------------------------------- 顶栏按钮 */
  document.getElementById('btnHelp').addEventListener('click', function () {
    UI.openModal('使用说明 · 三步理解傅里叶变换', [
      '<h4>1. 选信号</h4>',
      '<p>在实验台左侧点击一个信号芯片（如「单边指数」「矩形脉冲」「余弦」），下方会自动出现该信号的参数滑块。拖动滑块，四张图实时更新。</p>',
      '<h4>2. 加性质</h4>',
      '<p>在「性质变换」里点一个性质（如「时移 t₀」「频移 ω₀」「微分」），信号就会按该性质变换。可叠加多个性质，按顺序作用 —— 公式卡片会显示合成后的变换对。</p>',
      '<h4>3. 看频谱</h4>',
      '<p>四张图：时域、频域 |X(jω)|、相位谱 ∠X(jω)、以及可切换的 实部/虚部 或 dB 或能量谱。鼠标移到图上可读数；双击图表可重置 y 范围。</p>',
      '<h4>其它模块</h4>',
      '<ul>',
      '<li><b>性质表</b>：每张卡片给出性质公式、金句、以及一个「变换前 → 变换后」的实算缩略图。点「载入实验台」可放大细看。</li>',
      '<li><b>变换对</b>：表 4.2 速查，带实时缩略图。点信号名即可在实验台打开。</li>',
      '<li><b>系统频响</b>：选一个输入信号 + 一个系统（理想低通、RC、自定义有理式……），看 |H|、φ_H、x(t)/y(t)、|X|/|Y|。两个预设分别是课件例 4.1.1 和课堂测试。</li>',
      '</ul>',
      '<h4>左右排版</h4>',
      '<p>页面始终是「左控制面板 · 右波形」两栏，不会因屏幕小或缩放变成上下结构。中间那条竖线可以左右拖动来分配宽度，<b>双击复位</b>；点住它后用 <code class="kbd">← →</code>（按住 Shift 步长 64px）也能调。宽度会记住，下次打开还是你习惯的比例。</p>',
      '<h4>自定义信号</h4>',
      '<p>点「自定义 x(t)」打开抽屉，输入表达式（如 <code class="kbd">exp(-3*t)*u(t)</code> 或 <code class="kbd">rect(t/2)</code>），工具会用数值积分算出它的频谱。支持 <code class="kbd">sin cos exp abs sqrt sign u step rect gate sa sinc tri</code> 等函数和参数 <code class="kbd">a b c w0 T</code>。</p>',
      '<h4>数值说明</h4>',
      '<ul>',
      '<li>解析式信号走闭包通道，变换对严格精确。</li>',
      '<li>含「微分 / 积分」的链会触发数值逆变换重建波形，截断会引起 sinc 振铃 —— 这是正常现象，不是 bug。</li>',
      '<li>周期信号的频谱是冲激串：频域那一格只画箭头，箭头高度就是谱线强度 2πa_k，连续部分为 0。谱线之间相位无定义，所以相位谱那一格会是空的。</li>',
      '</ul>'
    ].join(''));
  });

  document.getElementById('btnReset').addEventListener('click', function () {
    UI.clearSave();
    location.reload();
  });

  document.getElementById('modalClose').addEventListener('click', UI.closeModal);
  document.getElementById('modal').addEventListener('click', function (e) { if (e.target.id === 'modal') UI.closeModal(); });

  document.getElementById('drawerClose').addEventListener('click', UI.closeDrawer);
  document.getElementById('customApply').addEventListener('click', function () {
    var expr = document.getElementById('customExpr').value.trim();
    if (!expr) { document.getElementById('customErr').textContent = '请输入表达式'; return; }
    try {
      FT.compile(expr);
    } catch (e) {
      document.getElementById('customErr').textContent = '解析失败：' + e.message;
      return;
    }
    document.getElementById('customErr').textContent = '';
    var st = FT.Lab.state;
    st.sigId = 'custom';
    st.custom.expr = expr;
    st.custom.window = parseFloat(document.getElementById('customWindow').value);
    // 参数保持原始字符串，由 buildCustomLayer 统一解析（与初始 state.custom.params 同类型）
    st.custom.params = document.getElementById('customParams').value;
    FT.Lab.pick('custom');
    UI.closeDrawer();
    UI.toast('已载入自定义信号');
  });

  document.getElementById('customWindow').addEventListener('input', function () {
    document.getElementById('customWindowVal').textContent = this.value;
  });

  /* 自定义预设 */
  var PRESETS = [
    { name: '单边指数', expr: 'exp(-3*t)*u(t)' },
    { name: '双边指数', expr: 'exp(-2*abs(t))' },
    { name: '门脉冲', expr: 'rect(t/2)' },
    { name: '三角脉冲', expr: 'tri(t/2)' },
    { name: 'Sa 型', expr: 'sa(3*t)' },
    { name: '阶跃', expr: 'u(t)' },
    { name: '符号函数', expr: 'sgn(t)' },
    { name: '拍频', expr: 'cos(5*t)*cos(t)' },
    { name: '衰减振荡', expr: 'exp(-t)*cos(4*t)*u(t)' },
    { name: '高斯', expr: 'exp(-t^2)' }
  ];
  var presetHost = document.getElementById('customPresets');
  PRESETS.forEach(function (p) {
    presetHost.appendChild(UI.chip(p.name, p.expr, false, function () {
      document.getElementById('customExpr').value = p.expr;
      document.getElementById('customErr').textContent = '';
    }));
  });

  /* 公式速查 */
  document.getElementById('btnFormula').addEventListener('click', function () {
    UI.openModal('公式速查 · 第四章', [
      '<h4>定义</h4>',
      '<p class="mx">X(jω) = ∫_{-∞}^{+∞} x(t)e^{-jωt} dt</p>',
      '<p class="mx">x(t) = (1/2π)∫_{-∞}^{+∞} X(jω)e^{jωt} dω</p>',
      '<h4>周期信号的傅里叶变换</h4>',
      '<p class="mx">X(jω) = 2π Σ_{k=-∞}^{+∞} a_k δ(ω-kω₀)</p>',
      '<h4>收敛条件</h4>',
      '<ul><li>充分条件 A：平方可积 ∫|x|²dt &lt; ∞</li><li>充分条件 B：Dirichlet（绝对可积 + 有限极值 + 有限间断点）</li><li>两组条件<strong>不等价</strong>（反例 sin t / t）</li><li>间断点处收敛于<strong>左右极限平均值</strong>，附近出现 Gibbs 现象</li></ul>',
      '<h4>常用变换对（表 4.2 精选）</h4>',
      '<table><tr><th>x(t)</th><th>X(jω)</th></tr>',
      '<tr><td>e^{-at}u(t)</td><td>1/(a+jω)</td></tr>',
      '<tr><td>e^{-a|t|}</td><td>2a/(a²+ω²)</td></tr>',
      '<tr><td>门_{2T₁}(t)</td><td>2T₁·Sa(ωT₁)</td></tr>',
      '<tr><td>sin(Wt)/(πt)</td><td>门_{2W}(ω)</td></tr>',
      '<tr><td>δ(t)</td><td>1</td></tr>',
      '<tr><td>u(t)</td><td>1/(jω)+πδ(ω)</td></tr>',
      '<tr><td>cos(ω₀t)</td><td>π[δ(ω-ω₀)+δ(ω+ω₀)]</td></tr>',
      '<tr><td>sin(ω₀t)</td><td>(π/j)[δ(ω-ω₀)-δ(ω+ω₀)]</td></tr>',
      '<tr><td>Σ_n δ(t-nT)</td><td>(2π/T)Σ_k δ(ω-2πk/T)</td></tr>',
      '<tr><td>[t^{n-1}/(n-1)!]e^{-at}u(t)</td><td>1/(a+jω)^n</td></tr>',
      '</table>',
      '<h4>性质（表 4.1）</h4>',
      '<table><tr><th>性质</th><th>公式</th></tr>',
      '<tr><td>线性</td><td>ax+by  aX+bY</td></tr>',
      '<tr><td>时移</td><td>x(t-τ)  X(jω)e^{-jωτ}</td></tr>',
      '<tr><td>频移</td><td>e^{jω₀t}x  X[j(ω-ω₀)]</td></tr>',
      '<tr><td>反转</td><td>x(-t)  X(-jω)</td></tr>',
      '<tr><td>展缩</td><td>x(at)  (1/|a|)X(jω/a)</td></tr>',
      '<tr><td>微分</td><td>dx/dt  jωX(jω)</td></tr>',
      '<tr><td>积分</td><td>∫_{-}^{t}x dτ  X(jω)/(jω)+πX(0)δ(ω)</td></tr>',
      '<tr><td>对偶</td><td>X(jt)  2πx(-ω)</td></tr>',
      '<tr><td>卷积</td><td>x*h  X·Y</td></tr>',
      '<tr><td>相乘</td><td>xy  (1/2π)X*Y</td></tr>',
      '<tr><td>Parseval</td><td>∫|x|²dt = (1/2π)∫|X|²dω</td></tr>',
      '</table>',
      '<h4>LTI 系统</h4>',
      '<p class="mx">H(jω) = Y(jω)/X(jω) = [b_M(jω)^M+...+b₀] / [(jω)^N+a_{N-1}(jω)^{N-1}+...+a₀]</p>',
      '<p>冲激响应 h(t) 与频率响应 H(jω) 是一对傅里叶变换。四步法：求 X → 求 H → 相乘得 Y → 逆变换得 y。</p>'
    ].join(''));
  });

  /* -------------------------------------------------------- 窗口自适应 */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (FT.Lab && FT.Lab.charts) Object.keys(FT.Lab.charts).forEach(function (k) { FT.Lab.charts[k].draw(); });
      if (FT.Topics) FT.Topics.resize();
    }, 200);
  });

  /* -------------------------------------------------------- 启动 */
  window.addEventListener('DOMContentLoaded', function () {
    UI.initSplits();
    FT.Lab.init();
  });

})(window);
