# 人物外观源文件

编号 0–5 对应观测员、设施看守、旅人、工匠、信使、采集者。在 Blockbench 中打开对应 `.bbmodel` 可编辑配件；保持原骨骼名称、UUID 和动画绑定。导出 glTF 时沿用基础模型的 16 单位／米及嵌入纹理设置。

六份变体均已在 Blockbench 实际打开并原生导出（scale=16、Binary GLB、嵌入纹理、导出动画），文件为 `reports/blockbench/npc_variant_0-native.glb` 至 `npc_variant_5-native.glb`。游戏仍由基础 NPC 加运行时外观配置生成角色，以共享基础几何及纹理；六份完整导出用于独立编辑与交接，不重复增加游戏加载请求。

`npx tsx tools/generate-npc-variants.ts` 可重现初始文件。脚本发现手工修改时拒绝覆盖；请先保留编辑版本，不要直接删除美术改动。手工编辑之后应重新导出并复核尺寸、颜色、动画和配件随骨骼运动。

运行 `npx tsx tools/check-npc-variant-exports.ts` 比对原生导出与生产基础 GLB 加运行时配件：六名人物各 84–96 三角形、1 材质、64×64 嵌入色板；每名含五段动画及20条曲线，曲线误差为0。对静止与每段动画五个时刻共26种姿态逐网格顶点比对，最大误差小于4.55e-8米，帽子、背包、围裙和挎包均跟随正确骨骼。报告 `reports/blockbench/npc-variants-roundtrip.json` 记录源及导出哈希。

浏览器 `tools/npc-native-preview.html` 实际加载六份原生文件，提供正反面和五段动画37%固定时刻检视。正面、背面行走及其余动作截图见 `.impeccable/review/npc-native-*.png`，无控制台错误或警告。固定姿态与离线轨道一致性不替代游戏内连续动作、距离辨识和性能验收。
