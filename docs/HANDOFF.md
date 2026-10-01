# 换电脑后的开发交接

2026-10-01局部精修：用户确认局部第4张概念图后，仪器GLB与操作台已更新。地板／墙面／流畅度认可不等于整个场景美术通过；本轮新美术待用户验收。参考与实机截图、检查范围见STATUS。代码源仍为recipes.ts，export.ts将已有CC0石材及确定性铜材贴图内嵌到GLB，独立文件可回读；scene.ts同步柱脚碰撞与操作台。无需新依赖或私人文件。

2026-10-01更新：用户已认可庭院画面及关闭返回。实际Chrome窗口关闭了图形加速，软件渲染仅约10–12 FPS；用户开启并重启后使用RTX 4060 Laptop，实测约165 FPS，用户随后确认“已经流畅了”。最新证据见STATUS。运行入口仍为`/courtyard.html`，刷新即可加载本轮优化。保留原型存档与60Hz物理规则。阴影缓存以当前灯位和人物read-ledger静态姿态为前提，后续如增加移动投影物，须显式更新阴影。浏览器自身Esc条幅不能由网页保证只显示一次。


异常低帧率时先确认实际试玩浏览器的渲染设备，不能用另一自动化窗口的帧率替代。若Chrome使用软件渲染且图形加速关闭，在`chrome://settings/system`启用图形加速并由用户重启浏览器；重启会影响其他窗口。此次未修改系统驱动或玩法，临时本地诊断不属于交付功能。

## 2026-09-30最新：P2庭院样板

本轮npm ci已完成，使用Node 24.15.0；锁文件未改动。`npm run dev`后访问`/courtyard.html`，或从原型首页点击庭院链接。构建包含两个入口，支持仓库子路径。样板只用内存日志，离开会清空，不读写原型档案。用户已授权开始制作，下面“仅规划／环境未恢复”为历史记录。

108项测试、类型、资产与交接、轨道筛选、构建、63资源子路径检查通过。真实Chrome检查了移动、门洞、台阶、仪器记录、阅读返回、设置返回和150%字号。随后录制了出生点→石牌→门洞往返→短梯→仪器记录→人物→日志的连续路线：真实W键驱动物理移动，脚本控制视角，无位置重置；不是用户盲测。切换真实浏览器标签后，hidden／focusLost暂停也已观察到。美术、手感、性能及后续闭环仍待验收。

本轮Playwright runner：本机Chrome的3项原有界面用例及2项庭院用例通过（分次执行）；庭院用例涵盖三次阅读返回、暂停来源日志、设置返回与模型503错误。

实机固定视点：[庭院](reference/courtyard-runtime.jpg)、[人物](reference/observer-runtime.jpg)；[连续检查路线录像](reference/courtyard-walkthrough.webm)。这些是游戏真实渲染，仍低于概念图细节，不是验收结论。

Playwright所需浏览器下载缓慢，已停止下载；本轮runner复用本机Chrome，Firefox未执行，历史Firefox WebGL2失败不因此关闭。构建有约4.97MB共享渲染／物理JS块警告；不能从静态包体或约91次绘制推断帧率达标。

资产编辑与重新导出见`licenses/courtyard/README.md`；运行不需要再次导出或安装建模软件。日常计划只更新Markdown。

## 前期记录（按当时范围理解）

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
