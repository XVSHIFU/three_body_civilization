# 换电脑后的开发交接

2026-09-30规划更新：第5–7节的庭院范围、入口轮换及返回／暂停核心语义已获确认，见PLAN-v0.3.md的D7–D9。已选定第3张庭院主参考及第1张人物辅助参考，文件与采用范围见计划第5节。第8节三项保存规则方向亦已确认（D10），原著依据、当前实现与改编边界已分开记录。D11已对齐两条路线、先庭院后闭环验收及扩展／发布边界，具体制作任务仍需确定。本轮仅更新文档，未修复游戏问题、未重跑游戏测试；下文2026-09-29检查仍为历史证据。

上轮Word由tools/export-plan.py重新生成，正文及表格与Markdown逐项比对一致（109段、6表）。分页渲染因缺少LibreOffice未完成，尚未做视觉排版验收；以Markdown内容为准。

2026-09-30评估补充：最新技术与资产评估见计划第4节；本轮仅更新Markdown，Word保留上轮快照。Three.js隔离页面成功加载Kenney门洞与角色，不等于正式原型恢复或用户体验验收。npm ci因字体包下载长时间等待而停止，node_modules可能不完整；下次运行前重新执行npm ci，锁文件未改动。

## 恢复顺序

```sh
git clone https://github.com/XVSHIFU/three_body_civilization.git
cd three_body_civilization
npm ci
npm run typecheck
npm test
npm run check:assets
npm run check:handoff
npm run build
npm run check:subpath
npm run dev
```

Node.js ≥22.12，本机24.18.0。Windows脚本策略限制时用npm.cmd。首次安装需要npm网络访问。运行核心原型不需要Python、Blockbench、私人技能或旧电脑依赖缓存。

生产预览：`npm run preview -- --port 4173`。浏览器测试先运行 `npx playwright install chromium firefox`，再运行 `npm run test:browser`。不把仅列举用例当作实际执行。

## 开发检查入口

| 路径 | 用途与限制 |
| --- | --- |
| /tools/technical-validation.html | 灰盒、正式控制器与基本仪器，不读写档案 |
| /tools/interaction-panel-preview.html | 正式组件，不证明实际场景到达 |
| /tools/hud-preview.html | HUD状态／字号，不运行物理世界 |
| /tools/city-preview.html | 正式运行时固定取景；相机与NPC为检查摆位 |
| /tools/instrument-preview.html | 仪器远近检视，不替代功能辨识试玩 |

上述页面由dev服务提供，不包含在默认发布入口。

异常复现：构建后运行 `npx tsx tools/preview-model-failure.ts`，4194端口下存在`.validation/model-block.enabled`时模型返回503，移除标记可直接重试。WASM脚本为tools/preview-startup-failure.ts，4191端口、`.validation/wasm-block.enabled`标记。结束时移除自己创建的标记，只用于隔离测试来源。

## 保留与隔离

- 保留代码、锁文件、源模型、原生导出、清单、许可及依赖的reports/fixtures、reports/blockbench、reports/vertex-assets。
- 保留旧计划、精选概念图、原型截图、用户反馈和任务卡参考。参考卡不自动授权执行。
- 五个一次性替换脚本移到旧电脑`.handoff-local/one-off-scripts`，不再作为维护工具提交。
- `.impeccable`旧会话与大量截图、`.validation`临时环境、node_modules、dist、本机测试档案导出不推送。原件未销毁，所需参考复制到docs/reference。
- 浏览器IndexedDB不随Git迁移。个人试玩进度由用户在设置中导出并自行转移；仓库夹具是合成数据。

## 可选资产和文档工具

运行原型不需要重新生成模型。不要自动运行generate/promote脚本。修改资产前读ASSET_HANDOFF.md及校验脚本，真实编辑和导出后核对清单与哈希。

check-native-export.py需要Pillow；字体子集重建需要fonttools[woff]。这是可选美术工具依赖，不是游戏启动条件。

Word计划书：安装Python包python-docx 1.2.0后执行 `python tools/export-plan.py`。Markdown为权威内容，Word由脚本生成。

## 避免误读

用户可以移动；返回多一步、穿模和不满意的美术尚未修复。102项测试和原生导出不能认证审美。A/B/C入口继续优化并可考虑轮换，游戏内视觉未获认可。第一轮方向已记录在计划D1–D6，不重复询问：采用方块建模起点与外部成熟资产，引擎评估由开发者承担，保存大体遵循原著，本地桌面优先。DESIGN.md描述旧实现，不强制新样板沿用。方向确认不构成付费采购、整套引擎迁移或全阶段开发批准。

## 本轮交接检查

2026-09-29实际执行：

- 原工作区typecheck、36文件／102项测试、21件资产校验和完整check:handoff通过。
- 从Git暂存内容导出到独立目录，执行 `npm ci --ignore-scripts` 成功（64个包）；未借用旧node_modules。随后typecheck、102项测试、21件资产、生产构建和45项子路径资源校验通过。
- .gitattributes保留文件原始字节，避免CRLF自动转换破坏模型源哈希；旧文本末尾空行不作为清理目标。
- 待提交文件约15.5MB；模式扫描未发现令牌／私钥候选、用户目录硬编码或超大文件。模式扫描不是完整安全审计。
- Word可重新生成，结构读取检查通过（84段、6表）；未在Word中做人工分页视觉验收，推荐以Markdown阅读和批注为准。
- 既有WASM大块构建提示保留。GitHub Actions结果以仓库实际运行记录为准；本地未运行Playwright runner。没有据此认证美术、穿模、真实路线或硬件性能。

新机器仍需自行复现。历史报告只在各自记录的版本和范围内有效。

### 首次GitHub Actions结果

[运行36511472179](https://github.com/XVSHIFU/three_body_civilization/actions/runs/36511472179)，代码提交 `a4b73348ff189e8b8abc6f3459b07d5172b43516`：npm ci、类型检查、102项逻辑测试、资产与交接检查、场景筛选、构建、子路径校验均通过。

Playwright runner实际执行6项，5通过、1失败。Chromium三项通过；Firefox主题／设置与小屏限制通过。Firefox关键模型故障用例先遇到“此设备未能创建WebGL2场景”，未到预期模型请求错误，故该用例失败。不能把这个结果改写为Firefox模型恢复通过或所有浏览器通过。

待处理的是确认CI图形环境，并在具备WebGL2的Firefox环境重跑同一用例；没有删除、放宽或跳过断言。此轮只交接并记录，不据该失败修改玩法。Actions还提示既有v4动作的Node20运行时弃用，更新CI工具应作为单独维护项。
