# 三体文明 · 本地开发版

基于用户 v0.2 执行计划，实现浏览器第一人称观测、证据记录与保存选择。入口提供 A 遗址测绘、B 天文台、C 复古科幻三种已批准方向；入口图为概念美术，进入后为实际 Three.js + Rapier 场景。

## 运行

Node.js ≥22.12（本机验证 24.18.0）。

```sh
npm ci
npm run dev
```

在终端给出的本地地址打开。桌面窗口至少 1024×640。WASD 移动、Shift 快走、鼠标观察、E 交互、J 日志、Esc 暂停。支持设置中重新绑定字母键。打开日志、失焦或丢失鼠标锁定会暂停；必须点击继续。内嵌浏览器当前拒绝 Pointer Lock，需在支持该权限的桌面浏览器实测。

入口可切换「三分钟演示」（`?experience=compressed`）与完整体验。演示压缩天空和气候演化，行走与 12 秒保存动作保持原速；约 120 秒高温警告、181 秒城市结局。两种模式分别使用本地档案及标签页占用通道，互不覆盖。暂停与阅读时间不计入世界时间。三分钟版的筛选报告见 `reports/compressed-scenario-screening.json`；逻辑结局已测，真实键鼠完整路线尚待验收。

## 检查

```sh
npm run typecheck
npm test
npm run check:assets
npm run check:handoff
npm run screen:scenarios
npm run build
```

生产已使用二十一件经 Blockbench 原生导出验证的嵌入纹理 GLB。首批七件更新源模型并完成原生导出与比对后，运行 `npm run promote:assets`；脚本校验源文件、报告与模型哈希，保留旧顶点色基线到 `reports/vertex-assets/`，再更新生产资产与清单。八件环境模块使用 `npx tsx tools/promote-environment-assets.ts` 更新；四件房屋模型使用 `npx tsx tools/promote-building-assets.ts` 更新；两类住宅及毁灭状态已接入六处城市占地，已完成正式运行时固定取景中的灾前／灾后检查；连续灾变及移动视角验收待完成。`generate:assets` 为初始几何生成器，当前会阻止覆盖已审核的原生资产。

GLTFLoader 测试覆盖尺寸、动画与实际嵌入 PNG 像素；浏览器已加载首批七件原生模型；新增温度仪与档案台已接入生产并有暂停场景截图，真实到达与操作路线待完成，首批七件的历史版本完成过生产场景五次重建。人物纹理换色与 mipmap 已接入；远距离移动视角过滤、实机显存仍待验证。

## 当前证据与边界

- `docs/IMPLEMENTATION.md`：计划 18 项任务及 M0–M5 逐项状态。
- `docs/ISSUES.md`：尚未解决或需实机／外部条件的问题。
- `docs/SCOPE_AUDIT.md`：对照原计划 27 个章节的实现缺口与验收边界。
- `reports/scenario-screening.json`：完整初始条件、可见窗口、误差对照与撤离窗口。
- `reports/scenario-trace.csv`：逐秒天象与温度序列。
- `reports/native-production-rebuilds.json`：首批七件原生纹理历史版本五次重建，检查点全部一致、旧上下文全部释放；不代表显存或保留堆测量。
- `reports/scene-rebuilds.json`：早期顶点色基线，五次真实浏览器出生点重建、检查点一致性与旧上下文释放记录；不代表保留堆或显存验收。
- `reports/asset-check.json`：资产验证范围，明确未验证部分。
- `.impeccable/review/`：界面检查截图；不等同实机性能报告。

当前不是已完成 M5 的发布版本。没有声称完整跨浏览器支持、固定帧率、全部美术实机验收或首次玩家无指导验收通过。11个资产族的源／原生导出／预算／来源清单已齐套，见 `docs/ASSET_HANDOFF.md`。

## 构建与部署

默认 `base: './'`，资源使用 `import.meta.env.BASE_URL`。项目站点可通过环境变量 `BASE_PATH=/仓库名/` 构建；尚未提供远端仓库与部署目标。

本地档案使用项目命名空间 IndexedDB。可导出 JSON；浏览器存储不是云备份。第二标签页只读，事务还会校验修订号。临时体验支持在内存中接续下一文明，但不会写入本地档案，关闭页面会丢失未导出的临时记录；正式模式的结算写入失败会保留界面供导出。

子目录资源检查：`npm run check:subpath`。输出 `reports/subpath-check.json`，只验证本地预览 HTTP 路径，不代表远端已发布。


独立基础技术验证页：开发服务运行后打开 `/tools/technical-validation.html`。仅加载平地、盒子、楼梯、观象柱、人物和固定测试太阳，复用正式角色控制器；提供坐标、贴地、锁定、暂停、绘制次数（含阴影通道）、帧间隔及模型尺寸。开发工具页不进入默认发布包，不读写游戏档案。

仪器距离检视：开发服务下打开 `/tools/instrument-preview.html`，可切换生产温度仪／档案台、5／20／50米距离、视角和指针样本温度。固定检视灯光，不改存档；远处功能辨识仍有待改善。


前端与场景检查工具（仅开发服务，不包含在默认发布入口）：

- `/tools/interaction-panel-preview.html`：正式仪器、设施组件的空状态、继承读数与确认操作。
- `/tools/hud-preview.html`：正式 HUD 的十种状态、大字号和多尺寸检查。
- `/tools/city-preview.html`：正式运行时的单日、双日、终结固定取景及三档画质。环境样本由 `npx tsx tools/create-city-review-fixtures.ts` 生成，相机和NPC为标注的检查摆位。

这些检查页不读写游戏档案。组件回调、暂停取景和静态绘制计数，均不能替代真实键鼠路线、连续演出、音频与90秒硬件性能测试。
