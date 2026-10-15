# AGENTS.md — Agent 协作约束

本文件约束任何在本仓库工作的 AI Agent / 自动化助手。规则按优先级排列,冲突时以靠前者为准。

## 交流

- 始终使用中文与维护者交流。

## 版本号(硬性规则)

1. **先调整,后版本**:所有功能与文档调整完成、并经维护者确认"可以发布"之后,才允许修改 `package.json` 的 `version`。开发中途不得提前改版本号。
2. **版本号必须询问**:更新版本号之前,必须向维护者给出建议(如 `1.2.0`)并等其确认,不得自行决定。
3. 版本号遵循 semver:新功能升次版本(`1.1.0 → 1.2.0`),修复升修订号(`1.1.0 → 1.1.1`),破坏性变更升主版本。

## 发布流程

- 账号操作(`git push`、`npm publish`、GitHub 网页操作)一律由维护者本人执行;Agent 只准备精确的命令与步骤。
- 发布前必须通过 `npm pack --dry-run` 核对打包清单与版本号。
- `git commit --amend` 仅允许在提交尚未推送时使用。

## 文档同步

- `client.js` 行为有任何变更,必须同步更新:`README.md`、`locale/zh.json`、`locale/en.json`。
- 插件已收录进 awesome-dsh-plugin 时,还需同步条目描述;描述末尾保持 `Requires DSH <spec>.` / `需要 DSH <spec>。` 句式(市场兼容性标签由此解析)。
- 文档与代码不一致会被收录评审打回。

## 代码约定

- 纯 JS `client.js`,经 `window.__ModuleLoader__.load({ id: 'dsh-bird-bike' })` 注册,不引入构建步骤。
- 美术调色板:`PAL_DAY` 与 `PAL_NIGHT` 的键必须成对维护;`prefers-reduced-motion` 下世界静止、不生成怪物。
- 每次改动后验证:`node --check client.js`,并用 rev 探测确认本地宿主服务返回 200。

## 环境备忘

- 仓库:`/Users/blackstar/github/dsh-bird-bike`;本地预览副本:`~/.dsh/profiles/web/node_modules/dsh-bird-bike`(发布前可临时同步以预览,商店升级会覆盖为注册表版本)。
- npm 缓存权限报错时,追加 `--cache /tmp/npm-cache-dsh`。
