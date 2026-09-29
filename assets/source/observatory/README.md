# 观象台模块交接

运行时与交接共同使用 `src/renderer/observatory-layout.ts`，单位米、Y 向上。修改平台、楼梯、挡墙或栏杆位置时应修改该文件，不在场景代码另抄坐标。

组成：6 个原生楼梯模块（每件 8 阶）、48 个西侧撤离台阶、24 段落地挡墙、平台及两根观测柱、20 段栏杆。高台另外包含方向旗和可阅读石牌。南侧入口与西侧出口保持开放。

楼梯的可编辑源为 `../stairs.bbmodel`，栏杆和路旗源在 `../environment/`。完整可编辑工程为 `observatory_assembly.bbmodel`，由 `npx tsx tools/generate-observatory-source.ts` 从共用布局与模块源生成，保留世界坐标及分组。生成器拒绝覆盖内容不同的已有工程，避免丢失手工修改。平台、西侧楼梯、挡墙和高台柱在运行时仍由配方创建；整套工程用于美术交接，未作为额外资源重复装入游戏。

执行 `npx tsx tools/report-observatory.ts` 可重新生成 `reports/observatory-assembly.json`。报告包含完整布局、实际生产 GLB 的 SHA-256 与逐实例三角形数，以及程序化立方体计数。当前共 2,544 三角形（含路旗、石牌及其刻线，内部面剔除前），低于计划的整套 6,000 上限。此预算不包括外围城市、天空或角色。

`tests/environment-assets.test.ts` 检查真实栏杆支脚支承和两个出口；`tests/player.test.ts` 用生产资产验证上楼及西侧撤离路线。自动化通行不替代桌面浏览器的实际键鼠试玩。

整套工程已在 Blockbench 实际打开，并以 scale=16、Binary GLB、内嵌纹理导出为 `reports/blockbench/observatory_assembly-native.glb`。运行 `npx tsx tools/check-observatory-export.ts` 核对 212 个部件的变换后角点与 5,088 个 UV 采样，最大顶点误差 1.91e-7 米，512×512 单纹理。报告为 `reports/blockbench/observatory_assembly-source-roundtrip.json`。

`tools/building-preview.html` 可选择“观象台整套”、50 米距离和 26 米总览眼高；实际 GLTFLoader 渲染已验证，浏览器未记录错误或警告，截图为 `.impeccable/review/observatory-assembly-native.png`。该总览不替代玩家眼高的距离辨识验收或实际键鼠试玩。
