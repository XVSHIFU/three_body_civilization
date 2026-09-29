# 环境模块源文件

本目录补齐原计划中的三种地面、角墙、栏杆与三类装饰物。八件已原生导出并接入生产；文件存在与自动检查不等于完整美术验收。

|模型|用途与尺寸约定|三角形 / 预算|
|---|---|---|
|ground_slab|4×4米平地板，厚0.25米，放置于y=-0.25时顶面为0|12 / 200|
|ground_band|同占地平整纹带，三部分顶面同高、边界无缝|36 / 200|
|ground_platform|4×4米、高1米台地；可走区域必须配接近台阶|24 / 200|
|wall_corner|4米外边长、厚0.5米、高3米的直角墙|24 / 500|
|railing|2米长、1.2米高栏杆，整段简单碰撞体|48 / 600|
|stone_cluster|低矮方块石簇，只放非主路边缘|36 / 250|
|supply_crate|封闭木箱，无背包／打开交互|72 / 250|
|route_flag|沿+X指向的静态阶梯旗形，按实际路线旋转|60 / 250|

均使用Generic格式、16编辑单位每米、512三色色板；节点独立命名，结构碰撞和表面装饰分开定义。原有wall、doorway、stairs继续使用，不重复生成。原计划未要求独立屋顶资产族，本目录不额外扩张数量。

重现：`npx tsx tools/generate-environment-sources.ts`。UUID与输出确定，任何源文件发生人工编辑时拒绝覆盖；不要删除编辑来绕过保护。

八件已通过真实Blockbench界面导出Binary GLB（scale16、内嵌纹理），位于reports/blockbench/*-native.glb；同目录*-source-roundtrip.json记录源／导出尺寸、UV取色与预算核对。可运行 `npx tsx tools/check-instrument-exports.ts ground_slab ground_band ground_platform wall_corner railing stone_cluster supply_crate route_flag` 重做比对。

浏览器 `/tools/building-preview.html` 已实际加载八件，5米斜侧面截图为.impeccable/review/<id>-5m.png；近距轮廓和颜色可见，无控制台错误／警告。检查页按模型高度调整注视点，眼高仍为1.645米。此项不等于最终场景美术验收。

正式地图使用98个模块实例，按资产与32米区域分组。铺面顶高0.01米，主路避开广场重叠区，地面碰撞合并为三个连续区域；角墙替换原边界四角，栏杆落在高台平整边缘，南梯与西梯出口留空；楼梯侧墙另以落地的阶梯挡墙实现，观象柱台基高度保持0.25米。旗帜按真实路线旋转，装饰物避开主通道。更新生产命令为 `npx tsx tools/promote-environment-assets.ts`。

铺面接缝显示／碰撞高度、玩家两条楼梯、六NPC同时撤离及全量90项测试通过。待完成：内部面清理、正式场景视觉、20／50米和移动视角检视。design.json中的source-only是生成时阶段记录；当前进展以本说明为准，源文件不为更新文字而改动。

运行时内部面优化：`npx tsx tools/generate-environment-volumes.ts` 从已核对的源方块生成绑定原生哈希的实体体积，供环境合批前的保守剔除使用。重新原生导出后应先更新往返报告再生成实体体积。`npx tsx tools/report-environment-geometry.ts` 记录当前98实例面数3072→2614；不改变源模型和碰撞定义。4044条外部射线及全量93测试通过，移动画面／性能仍待实机验证。
