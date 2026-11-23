# 部署指南 - 傅里叶变换可视化实验台

## 当前状态
- 本地文件：`傅里叶变换可视化实验台.html` (203 KB)
- 所有功能已修复并测试通过
- 公式显示为教材风格纯文本，无 LaTeX 乱码

## 快速启动（本地测试）

### 方法 1：直接打开
双击 `傅里叶变换可视化实验台.html` 文件，在浏览器中打开即可使用。

### 方法 2：HTTP 服务器
```bash
cd "C:\Users\27308\Documents\Qoder\2026-11-23\5074d066"
python -m http.server 8080
```
然后访问：http://localhost:8080/傅里叶变换可视化实验台.html

## 公网部署方案

### 方案 1：GitHub Pages（推荐，免费）

#### 步骤 1：创建 GitHub 仓库
1. 登录 GitHub
2. 点击 "New repository"
3. 命名：`fourier-transform-lab`
4. 选择 "Public"
5. 点击 "Create repository"

#### 步骤 2：上传文件
```bash
cd "C:\Users\27308\Documents\Qoder\2026-11-23\5074d066"
git init
git add .
git commit -m "Initial commit: Fourier Transform Lab"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fourier-transform-lab.git
git push -u origin main
```

#### 步骤 3：启用 GitHub Pages
1. 进入仓库 Settings → Pages
2. Source 选择 "Deploy from a branch"
3. Branch 选择 "main" / "root"
4. 点击 "Save"
5. 等待几分钟后，访问：`https://YOUR_USERNAME.github.io/fourier-transform-lab/`

### 方案 2：Netlify（免费，自动 HTTPS）

#### 步骤 1：注册 Netlify
访问 https://www.netlify.com/ 并注册账号

#### 步骤 2：拖拽部署
1. 登录 Netlify
2. 将 `傅里叶变换可视化实验台.html` 拖拽到 Netlify 界面
3. 或点击 "Add new site" → "Deploy manually"
4. 上传整个文件夹

#### 步骤 3：获取链接
Netlify 会自动生成一个随机域名，如：`https://random-name-12345.netlify.app`

#### 可选：自定义域名
在 Netlify Dashboard → Domain settings 中添加自定义域名

### 方案 3：Vercel（免费，自动 HTTPS）

#### 步骤 1：安装 Vercel CLI
```bash
npm install -g vercel
```

#### 步骤 2：部署
```bash
cd "C:\Users\27308\Documents\Qoder\2026-11-23\5074d066"
vercel --prod
```

#### 步骤 3：获取链接
Vercel 会生成一个链接，如：`https://project-name.vercel.app`

### 方案 4：Cloudflare Pages（免费，CDN 加速）

#### 步骤 1：连接 GitHub
1. 登录 Cloudflare Dashboard
2. Workers & Pages → Create application → Pages
3. Connect to Git → 选择 GitHub 仓库

#### 步骤 2：配置
- Build command: 留空（静态文件无需构建）
- Build output directory: `/`

#### 步骤 3：部署
Cloudflare 会自动从 GitHub 拉取代码并部署

## 验证部署

部署完成后，请验证以下功能：

1. ✅ 首页加载正常，导航栏可点击
2. ✅ 信号选择按钮可点击，公式正确显示
3. ✅ 性质变换链正常工作
4. ✅ 变换对表格显示清晰
5. ✅ 自定义信号可以输入和计算
6. ✅ 幅度谱和相位谱对称显示
7. ✅ 所有公式均为纯文本，无 LaTeX 乱码

## 性能优化建议

### 1. 压缩 HTML
使用在线工具压缩 HTML 文件，减小体积：
- https://htmlcompressor.com/
- https://www.willpeavy.com/tools/minifier/

### 2. 启用 Gzip/Brotli
如果使用 Nginx/Apache，启用压缩：
```nginx
gzip on;
gzip_types text/html application/javascript;
```

### 3. CDN 加速
- Cloudflare（免费）
- jsDelivr（如果托管在 GitHub）

### 4. 缓存策略
设置 HTTP 头：
```
Cache-Control: public, max-age=31536000
```

## 故障排查

### 问题 1：页面空白
- 检查浏览器控制台是否有 JavaScript 错误
- 确认所有 JS 文件路径正确
- 尝试清除浏览器缓存

### 问题 2：公式仍然乱码
- 确认 HTML 文件编码为 UTF-8
- 检查 `<meta charset="UTF-8">` 是否存在
- 刷新页面（Ctrl+F5 强制刷新）

### 问题 3：图片不显示
- 确认图片路径正确（相对路径 vs 绝对路径）
- 检查图片文件是否存在于同一目录

### 问题 4：移动端显示异常
- 添加 viewport meta 标签：
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ```
- 使用响应式 CSS

## 分享链接

部署成功后，可以将链接分享给：
- 同学/同事
- 教学群组
- 社交媒体
- 博客/论坛

示例链接格式：
- GitHub Pages: `https://username.github.io/fourier-transform-lab/`
- Netlify: `https://random-name-12345.netlify.app/`
- Vercel: `https://project-name.vercel.app/`

## 后续维护

### 更新内容
1. 修改源文件（src/js/*.js）
2. 重新生成 HTML 文件
3. 提交到 Git 仓库
4. 平台会自动重新部署

### 版本控制
建议使用 Git 管理版本：
```bash
git add .
git commit -m "Fix: 修复性质表公式显示"
git push
```

### 备份
定期备份重要文件：
- 源代码（src/ 目录）
- HTML 文件
- 配置文件

---

**最后更新**: 2026-11-23  
**文档维护者**: Qoder Assistant
