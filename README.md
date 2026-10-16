# 一念成仙 · Cultivation Survivors

一个使用原生 HTML、CSS、JavaScript 和 Canvas 制作的 2D 修仙幸存者肉鸽游戏原型，可部署到 GitHub Pages。

## 本地运行

最简单的方式：直接打开 `index.html`。推荐使用 VS Code 的 Live Server 插件在本地预览。

## 操作

### 电脑
- `W A S D` 或方向键：移动
- `Space` / `J`：释放范围剑气
- `P` / `Esc`：暂停

### 手机
- 左下角虚拟摇杆：移动
- 右下角「剑气」按钮：释放范围技能
- 顶部暂停按钮：暂停游戏

## 游戏循环
- 灵剑自动攻击范围内最近的妖兽。
- 妖兽被击败后掉落灵气，靠近后自动吸收。
- 升级时从随机三项功法中选择一项。
- 生存时间越长，妖兽会逐渐变强、刷新更频繁。

## 部署到 GitHub Pages
1. 在 GitHub 新建一个仓库，例如 `cultivation-survivors`。
2. 上传 `index.html`、`css/`、`js/` 和本 README。
3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment** 中选择 **Deploy from a branch**。
5. Branch 选择 `main`，目录选择 `/(root)`，点击 Save。
6. 等待部署完成，GitHub Pages 页面会显示网址。

## 项目结构

```text
cultivation-survivors/
├── index.html
├── README.md
├── css/
│   └── style.css
└── js/
    ├── input.js
    ├── ui.js
    └── main.js
```

## 后续可扩展
Boss、武器图鉴、永久解锁、地图障碍、音效、更多功法、存档、设置面板。
