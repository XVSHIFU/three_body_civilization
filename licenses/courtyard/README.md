# 庭院样板资源

`manifest.json`记录本轮文件、SHA-256、来源和改编。Kenney两份包内许可证保留在本目录；Poly Haven资源按[CC0说明](https://polyhaven.com/license)使用和再分发，原始下载地址由各资源的公开files API给出。没有采购付费包；这不改变项目整体许可。

- 门洞：Kenney Castle Kit的wall-doorway；原始源副本在`assets/source/courtyard/kenney-doorway.glb`。游戏按米适配为4×5.4×1.4，原点在地面；原始网格生成三角形碰撞，门墙另有明确方盒代理，避免封死开口。
- 人物：Kenney Blocky Characters 2.0的character-a；原始GLB和外部PNG保留在`public/assets/courtyard/observer-base.glb`及Textures目录。脚本增加袍、披肩、帽与图册，保留27段节点动画，另加read-ledger姿态。不是蒙皮骨架，也未声称全部动作已适配。运行缩放0.72，交互在角色根节点，碰撞为独立立方体。
- 仪器：`src/courtyard/recipes.ts`为可编辑源，导出`armillary.glb`，单位米、地面原点、3种标准受光材质。本轮增加分段石柱、局部倒角、铜箍、轴承、分层底座与球面经纬线，共14208个三角形，保留原有15000面检查上限。石材漫反射从下述White Sandstone资源选取UV区域并以PNG内嵌，铜材斑驳由export.ts确定性生成并内嵌；细刻线为低段数几何。环架是静态模型；操作点为前方手高瞄准台。默认闭环读取真实模拟天空中仪器可见的方向并原子保存事实；sample模式仍为固定光源与内存日志。
- 保存点：`src/courtyard/shelter.ts`为可编辑米制代码源，`shelter.glb`内嵌同一CC0砂岩漫反射；共6种材质。根节点保留方盒碰撞extras，preservation-console为交互节点，preserved-body为独立可隐藏的扁平身体。单组架、台、水盆和遮棚为项目几何，不从概念图提取纹理；水面为静态表现，救助过场明确为游戏改编。
- 石材：Poly Haven White Sandstone Blocks 02用于墙面，Large Sandstone Blocks用于地坪；1k漫反射、OpenGL法线与粗糙度原图。UV、法线强度和材质适配在`src/courtyard/scene.ts`；地坪使用固定高粗糙度。
- 庭院布局、碰撞、操作点：`src/courtyard/scene.ts`。只包含一个庭院；外部剪影不可探索。

重新编辑导出：修改`src/courtyard/recipes.ts`或`shelter.ts`后，安装项目依赖与Playwright Chromium，运行`npx tsx tools/export-courtyard.ts`。它启动临时本地Vite，通过GLTFExporter导出内嵌贴图的标准GLB；游戏重新加载这些GLB。导出后更新manifest哈希并执行`npm test`，再查看真实场景。可通过临时环境变量COURTYARD_CDP复用已启动的本地检查浏览器；不要将本机连接地址提交到仓库。

本轮实现未经过Blender或Blockbench原生编辑，代码源→GLB→游戏回读不冒充这两项工具链已经验证。概念参考图片不作为模型或纹理来源。
