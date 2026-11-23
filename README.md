# 傅里叶变换可视化实验台

一个交互式的连续时间傅里叶变换（CTFT）可视化工具，用于学习和探索信号与系统课程中的核心概念。

## ✨ 特性

- 📊 **22 种预设信号**：包括指数、矩形、三角、Sa、冲激、阶跃、正弦等
- 🔧 **11 种性质变换**：时移、频移、反转、展缩、共轭、微分、积分、对偶等
-  **实时可视化**：时域波形、幅度谱、相位谱同步更新
-  **对称显示**：频域和时域均采用对称范围（-ωmax 到 +ωmax）
- 📝 **教材风格公式**：所有公式使用纯文本 Unicode，清晰易读
- 🛠️ **自定义信号**：支持手动输入数学表达式
-  **状态保存**：自动保存当前配置到本地存储

## 🚀 快速开始

### 本地使用
1. 下载或克隆本仓库
2. 双击打开 `傅里叶变换可视化实验台.html`
3. 在浏览器中即可使用

### 在线访问
访问公网链接（部署后）：
- GitHub Pages: `https://username.github.io/fourier-transform-lab/`
- Netlify: `https://random-name-12345.netlify.app/`

##  使用说明

### 标签页导航
1. **实验台 (Lab)** - 主界面，选择信号并应用性质变换
2. **性质表 (Props)** - 查看 11 种傅里叶变换性质的详细说明和示例
3. **变换对 (Pairs)** - 浏览常用信号的傅里叶变换对照表
4. **专题 (Topics)** - 深入理解特定主题（如调制、采样等）

### 信号选择
- 点击左侧信号列表中的任意信号
- 信号分为三类：非周期信号、周期信号、自定义
- 每个信号显示其时域表达式 x(t)

### 参数调整
- 拖动滑块调整信号参数（如衰减系数 a、脉冲宽度 T₁ 等）
- 参数变化会实时更新波形和频谱

### 性质变换
- 在"性质变换"区域点击任意性质按钮
- 可以叠加多个性质，形成变换链
- 每步变换的公式会在"公式速查"卡片中显示

### 视图选项
- **重叠显示**：对比原始信号和变换后的信号
- **冲激谱线**：显示频谱中的冲激分量
- **相位展开**：将相位谱展开为连续曲线
- **π 刻度**：用 π 的倍数标注频率轴
- **Hz 单位**：切换 rad/s 和 Hz 单位

## 📚 包含的信号

### 非周期信号（14 个）
1. 单边指数 e^{-at}u(t)
2. 反因果指数 e^{at}u(-t)
3. 双边指数 e^{-a|t|}
4. t·e^{-at}u(t)
5. t^{n-1}/(n-1)!·e^{-at}u(t)
6. 矩形脉冲（门函数）
7. 三角脉冲
8. 抽样信号 Sa(Wt)/(πt)
9. 单位冲激 δ(t)
10. 延时冲激 δ(t-t₀)
11. 冲激偶 δ'(t)
12. 单位阶跃 u(t)
13. 符号函数 Sgn(t)
14. 直流 1

### 周期信号（7 个）
1. 复指数 e^{jω₀t}
2. 余弦 cos(ω₀t)
3. 正弦 sin(ω₀t)
4. 均匀冲激串 Σδ(t-nT)
5. 周期矩形脉冲
6. 双音信号 cos(ω₁t)+cos(ω₂t)
7. 调幅波 cos(ωct)·cos(Ωt)

### 自定义信号（1 个）
- 用户可输入任意数学表达式定义 x(t)

## 🎓 包含的性质

1. **时移** Time Shifting - x(t-t₀)  e^{-jωt₀}X(jω)
2. **频移** Frequency Shifting - e^{jω₀t}x(t)  X[j(ω-ω₀)]
3. **时间反转** Time Reversal - x(-t) ⟷ X(-jω)
4. **尺度变换** Scaling - x(at) ⟷ (1/|a|)X(jω/a)
5. **共轭** Conjugation - x*(t) ⟷ X*(-jω)
6. **时域微分** Differentiation - dx/dt ⟷ jωX(jω)
7. **时域积分** Integration - ∫x dτ ⟷ (1/jω)X(jω)+πX(0)δ(ω)
8. **频域微分** Frequency Differentiation - t·x(t) ⟷ j·dX/dω
9. **对偶性** Duality - X(jt)  2πx(-ω)
10. **幅度调制** Modulation - x(t)cos(ω₀t) ⟷ (1/2)[X(j(ω-ω₀))+X(j(ω+ω₀))]
11. **理想抽样** Sampling - x(t)Σδ(t-nT) ⟷ (1/T)ΣX[j(ω-2πk/T)]

## 🛠️ 技术栈

- **前端**: 原生 JavaScript (ES5+)
- **绘图**: HTML5 Canvas
- **数学计算**: 数值傅里叶变换（梯形积分法）
- **公式渲染**: 纯文本 Unicode（无需 LaTeX 引擎）
- **状态管理**: localStorage

## 📁 项目结构

```
fourier-transform-lab/
├── 傅里叶变换可视化实验台.html    # 主 HTML 文件（单文件应用）
├── src/
│   ├── js/
│   │   ├── signals.js          # 信号库（22 个信号）
│   │   ├── core.js             # 复数运算、傅里叶层、数值变换
│   │   ├── lab.js              # 实验台核心逻辑
│   │   ├── props.js            # 性质算子（11 个）
│   │   ├── propsview.js        # 性质卡片视图
│   │   ├── pairsview.js        # 变换对表格视图
│   │   ├── ui.js               # UI 组件
│   │   ├── main.js             # 首页和全局控制
│   │   ├── modview.js          # 调制模块
│   │   ├── sysview.js          # 系统模块
│   │   ├── mml.js              # MathML 渲染器（兼容层）
│   │   ├── chart.js            # 图表绘制
│   │   └── topics.js           # 专题模块
│   ── css/                    # 样式文件（内联在 HTML 中）
── FIXES_SUMMARY.md            # 修复总结
├── DEPLOYMENT.md               # 部署指南
└── README.md                   # 本文档
```

##  开发

### 修改源代码
1. 编辑 `src/js/*.js` 文件
2. 重新生成 HTML 文件（将所有 JS 和 CSS 内联）
3. 测试功能是否正常

### 添加新信号
在 `src/js/signals.js` 中添加：
```javascript
SIG.newSignal = {
  group: 'nonperiodic',
  name: '新信号名称',
  order: 23,
  kind: 'energy',
  formulaT: 'x(t) 表达式',
  formulaX: 'X(jω) 表达式',
  params: [{ key: 'param', label: '参数名', min: 0, max: 10, step: 0.1, def: 1 }],
  window: { tmax: 10, wmax: 20 },
  build: function (p) {
    return {
      xfn: function (t, o) { /* 时域计算 */ },
      Xfn: function (w, o) { /* 频域计算 */ }
    };
  }
};
```

### 添加新性质
在 `src/js/props.js` 中添加：
```javascript
PROP.newProp = {
  id: 'newprop',
  name: '新性质名称',
  en: 'English Name',
  sec: '章节号',
  short: '简短描述',
  formula: '公式（纯文本）',
  quote: '金句',
  desc: '详细说明',
  params: [{ /* 参数定义 */ }],
  apply: function (L, p) {
    // 返回新的 Layer
    return FT.makeLayer(/* ... */);
  }
};
```

## 🐛 已知问题

1. **数值精度**：自定义信号的频谱通过数值积分计算，可能存在轻微误差
2. **截断效应**：非绝对可积信号（如 u(t)、常数）的频谱会有泄漏纹波
3. **Gibbs 现象**：间断点附近的频谱重建会出现振铃
4. **移动端适配**：部分控件在小屏幕上可能显示不佳

##  更新日志

### v1.1 (2026-11-23)
- ✅ 修复所有公式显示为 LaTeX 乱码的问题
- ✅ 改用纯文本 Unicode 格式，清晰易读
- ✅ 修复实验台信号选择和公式加载
- ✅ 修复自定义信号功能
- ✅ 幅度谱和相位谱改为对称显示
- ✅ 清除所有 LaTeX 残留（main.js, modview.js, sysview.js）
- ✅ 添加安全转义，防止 XSS 攻击

### v1.0 (初始版本)
- 基础功能实现
- 22 种预设信号
- 11 种性质变换
- 实时可视化

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 👨‍🏫 致谢

本工具基于《信号与系统》课程内容开发，参考了相关教材和课件。

---

**最后更新**: 2026-11-23  
**作者**: Qoder Assistant  
**联系**: [GitHub Issues](https://github.com/username/fourier-transform-lab/issues)
