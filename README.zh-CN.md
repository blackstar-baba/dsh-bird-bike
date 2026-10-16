# dsh-bird-bike 🐦🚲

[![npm version](https://img.shields.io/npm/v/dsh-bird-bike)](https://www.npmjs.com/package/dsh-bird-bike)

[English](README.md) | 简体中文

像素小鸡骑自行车 —— DeepSeek Harness(DSH)Web GUI 底部的我的世界像素风骑行带。

![白天](assets/screenshot-day.png)

![夜晚](assets/screenshot-night.png)

## 特性

- 🐦 **像素小鸡骑士**:IK 反向动力学蹬腿、2 帧扑翅、会眨眼、戴蓝绿头盔
- 🚲 **像素自行车**:辐条车轮、链条牙盘、踏板曲柄
- 🌙 **昼夜循环**:约 80 秒一天,黄昏/黎明按 8 级色阶切换;夜晚有星星、方形月亮和车头灯光锥
- 👾 **怪物出没**:白天苦力怕向你走来,接近到 2m 触发引信(闪烁加速预警),爆炸把小鸡炸上天空(自动超级跳,无惩罚);夜晚僵尸缓缓逼近,接触瞬间被撞飞(旋转飞出)
- 🔔 **按铃**:芯片音叮铃 + MC 风彩色像素音符粒子 + 短暂加速冲刺(扬尘)
- 🦘 **跳跃**:方块感小跳,落地扬尘
- ⏱ **骑行统计**:里程 / 车速 / 骑行时长(仅实际骑行时累计),固定宽度等宽数字槽,不抖动
- ▾ **可收起**:整条骑行带收成 40px 迷你车道,状态本地持久化
- ♿ 尊重 `prefers-reduced-motion`:静止场景,交互仍可用

## 安装

### 方式一:官方 CLI(推荐)

```sh
# npm 包
dsh plugin --profile web add dsh-bird-bike

# 或直接从 GitHub 安装
dsh plugin --profile web add git+https://github.com/blackstar-baba/dsh-bird-bike.git
```

纯 JavaScript、零构建、无 prepare 脚本 —— 安装时不会触发 pnpm 的 allowBuilds 构建授权。

### 方式二:DSH 插件管理器

1. 打开 DSH Web GUI → 侧边栏 **Plugins**
2. **Add plugin** → 箭头 → **Install a third-party plugin**
3. 粘贴仓库地址:`https://github.com/blackstar-baba/dsh-bird-bike` 并确认安装 —— 骑行带出现在应用底部

### 方式三:手动 link 本地克隆

```bash
git clone https://github.com/blackstar-baba/dsh-bird-bike.git
cd ~/.dsh/profiles/<你的profile>          # 例如 web
pnpm add link:/absolute/path/to/dsh-bird-bike
```

然后在 GUI 的 **Plugins** 页面启用 `dsh-bird-bike`(或把 `"dsh-bird-bike"` 加入 profile `package.json` 的 `dsh.profile.bundles`)。

## 操作

| 操作 | 效果 |
| --- | --- |
| 点击骑行带 | 按铃加速 + 音符 |
| 🔔 | 按铃 |
| 🦘 | 跳跃 |
| 🌙 / ☀️ | 切换昼夜 |
| ▾ / ▴ | 收起 / 展开骑行带 |

## 实现说明

- 纯 JavaScript、零依赖、零构建:一个 `client.js` 通过 `window.__ModuleLoader__` 注册懒工厂,挂进 ui-layout 的 `shell.bottom` 槽位
- 整个场景画在低分辨率离屏画布上(1 艺术像素 = P 个 CSS 像素),用硬像素原语(矩形 / Bresenham 线 / 扫描线椭圆)绘制,再最近邻放大
- 界面 chrome 使用 `--dsw-*` 主题 token;画面配色为作品自定调色板(artwork exception)

## 卸载

GUI 的 **Plugins** 页面移除;或手动 `pnpm remove dsh-bird-bike`(在 profile 目录)并从 `dsh.profile.bundles` 移除。

## 兼容性

**需要 DSH >= 0.2.1-alpha**(骑行带挂载的 `shell.bottom` 插槽自该版本起提供)。

在 DSH 源码检出(source checkout)的 `web` profile 上开发测试(`dsh.client` platform: web,manifest 声明 `dsh.bundle`)。无 npm 依赖,仅依赖 Client 基线内置模块(react、slots)。

## License

[MIT](LICENSE)
