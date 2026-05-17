# 请勿食用此蘑菇 (Don't Eat These!)

这是一个名为“请勿食用此蘑菇”的手机网页互动产品，主要功能为灵感记录与心理疗愈。采用纯前端+浏览器本地存储（LocalStorage）方案，实现“零后端”轻量化上线。

## 功能特性
- **林间空地**：点击首图蘑菇获取互动反馈。
- **灵感记录**：采用液态玻璃风格 UI，记录灵感并保存在本地。
- **孢子季风**：记录满3条灵感后解锁信件与互动动画，通过向上拖拽拔出迷惑菇。

## 项目结构
项目完全遵循语义化命名规范，方便新手理解和修改：
- `assets/`：存放静态资源（图片、图标、音效等）
- `styles/`：存放所有 CSS 样式文件
- `scripts/`：存放所有 JS 交互脚本
- HTML 文件按照 `板块-功能.html` 的格式命名

## 本地运行与测试
本项目纯前端，不需要配置复杂的服务器环境。
1. 直接在文件夹中双击 `index.html` 在浏览器中打开。
2. 按下 `F12` 打开开发者工具，点击“设备模拟器”（Device Toolbar），选择一个手机型号（如 iPhone 12/13）以获得最佳体验。
3. 也可以使用 VS Code 的 Live Server 插件运行。

## 部署上线指南
本项目非常适合部署在免费的静态托管平台（如 Vercel 或 GitHub Pages）。

### 方法一：使用 Vercel (最简单)
1. 访问 [Vercel](https://vercel.com/) 并注册账号。
2. 在 Dashboard 中点击 `Add New` -> `Project`。
3. 如果代码在本地，可以选择 `Upload` 文件夹的方式，直接将包含 `index.html` 的整个文件夹拖拽上传。
4. 点击 `Deploy`，Vercel 会自动为你生成一个免费的、任何人都可以访问的网址。

### 方法二：使用 GitHub Pages
1. 注册一个 GitHub 账号，创建一个新的 public 仓库。
2. 将本文件夹下的所有内容上传到该仓库。
3. 在仓库的 `Settings` 中，找到左侧栏的 `Pages`。
4. 在 `Source` 中选择 `main` 或 `master` 分支，点击 `Save`。
5. 稍等一两分钟，GitHub 会显示一个链接，例如 `https://yourusername.github.io/your-repo-name`，这就是你的上线网址。

## 许可证
MIT License
