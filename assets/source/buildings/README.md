# 房屋外壳源设计

两类非可进入背景建筑：`house_terrace` 为错层平顶，`house_tower` 为高冠竖向立面，各带 `_ruined` 破坏状态。完整模型各96三角形，使用512三色色板。无可交互门洞；不要把立面装饰当作可进入室内。

初版生成命令：`npx tsx tools/generate-building-sources.ts`。源文件如被编辑，生成器拒绝覆盖。当前废墟为 v2，使用 `npx tsx tools/refine-building-ruins.ts` 进行受哈希保护的一次升级；重复运行不会覆盖人工改动。每件 `.design.json` 标注尺寸、主体碰撞候选与未验收项。

四件模型已通过Blockbench原生Binary GLB导出（scale16、内嵌纹理），保存在reports/blockbench，已纳入生产清单。运行 `npx tsx tools/check-instrument-exports.ts house_terrace house_tower house_terrace_ruined house_tower_ruined` 可核对源文件尺寸、三角形和纹理采样。

开发检视页 `/tools/building-preview.html` 已实际加载四件模型，20米斜侧面截图位于.impeccable/review/house-*-preview.png。废墟 v2 已改成不等高残墙、落地屋顶／冠顶与碎块，保留原来的占地边界；平顶废墟 132 三角形、高冠废墟 144 三角形，均为单材质 512 色板。正式城市六处住宅已按原占地缩放安置，交替使用两类模型并旋转复用；灾变同步切换模型和结构碰撞体。自动测试覆盖占地、碰撞状态、楼梯及设施门路线。完整房屋和废墟均已保守删除完整遮挡三角形。六处废墟 1,536 条向下射线与真实 Rapier 碰撞表面一致；全量测试包含六名 NPC 撤离。浏览器20米模型检视、第二类5米检视已通过，现场动态灾变、移动过滤及50米辨识仍待验收。更新原生导出后运行 `npx tsx tools/promote-building-assets.ts`，脚本先校验全部来源证据再更新生产文件。


v2 保留前版源、设计、原生导出及生产文件于 `.validation/ruins-v1`。新断墙和落件均有逐构件结构碰撞，推广脚本按 `structuralNames` 读取源文件并拒绝未经处理的旋转碰撞块。生产清单版本为2，尺寸／纹理往返报告位于 `reports/blockbench/*ruined-source-roundtrip.json`。新增细节使六处废墟合计从162增加到762个运行时三角形；未把这次视觉改进称作性能优化。
