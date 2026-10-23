# 心防崩解 三消互动演示

本项目提供一段可放在剧情中段调用的三消会谈：前置剧情位置 → 点击剧情选项 → 震屏并向两侧裂开 → 双人立绘与台词框 → 快速三消与阶段剧情 → 心防击破 +20 → 后续剧情节点。演示集中在陆星河与裴予迟的一次会谈；完成本场不会直接解锁人物最终结局。

公开演示：[打开完整片段](https://xinfang-story-match3.muddyflint6.chatgpt.site/)。独立游戏：[直接调用](https://xinfang-story-match3.muddyflint6.chatgpt.site/?embed=1)。[剧情播放器嵌入示例](https://xinfang-story-match3.muddyflint6.chatgpt.site/embed-demo.html)。

## 本地运行

需要支持 Vite 8 的 Node.js 环境。当前已在 Node.js 26 下验证。

```powershell
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1
```

完整演示：<http://127.0.0.1:3000/>。独立玩法：<http://127.0.0.1:3000/?embed=1>。剧情播放器调用示例：<http://127.0.0.1:3000/embed-demo.html>。

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 3000 --strictPort
```

开发服务与生产预览使用同一端口时，应先停止其中一个。生产预览需要在修改后重新执行 build。

## 演示规则

点击开场选项即触发约 1.25 秒的战斗入场演出，无需再次确认。立绘对话按切入方式切换台词，说话人物提亮；点击台词或“继续对话”可补全／推进文字，也可以跳过。转场和战前对话结束后才启用棋盘与计时。系统启用“减少动态效果”时简化转场并立即显示完整台词。

默认使用 18 步，不启用实时倒计时。三重心防依次为 24、40、56；每次有效交换消耗 1 步，一次交换的连锁只扣这 1 步。无效交换扣 4 点从容、不扣步数。从容归零会中断会谈。

正常进入、刷新和重开均重新生成棋盘。每次尝试从浏览器随机源获取新的 32 位种子，按行列约束填入五色宝石，避开开局三连，并检查至少存在一步合法交换；补落继续使用本局的随机序列。`src/data/demo.ts` 中 `seed: null` 表示每局随机；开发时可指定数字种子，或用 `/?seed=20261020` 复现同一开局与同样操作下的补落。结果返回本局 `seed`，便于还原问题。指定种子的预览在重开时也会复现该棋盘。

每颗命中宝石造成 1 点基础伤害，创伤宝石额外 +1。不同形状的奖励如下，伤害和 SP 奖励按同轮每组分别计算：

| 消除形状 | 合成宝石 | 额外伤害 | 额外 SP |
| --- | --- | --- | --- |
| 直线三消 | 无 | 0 | 0 |
| 直线四消 | 横向／纵向冲击针 | +2 | +3 |
| L／T／十字形 | 心灵炸弹（3×3） | +3 | +4 |
| 直线五消 | 恶女之瞳 | +5 | +5 |
| 直线六消／七消 | 恶女之瞳 | +8／+11 | +8／+11 |

交叉形状含直线五消以上时，优先按对应直线合成和奖励计算。同轮每多消除一组，再额外增加 2 点伤害和 2 SP。玩家交换及其自然补落连锁中出现直线五消以上，返还 1 步，每次交换最多返还 1 步；技能、心火不会返还步数。

补落会重复扫描全盘所有匹配组，直到棋盘稳定。连锁倍率依次为 ×1、×1.25、×1.5……最高 ×2.5，与创伤回溯 ×1.4 叠乘。伤害公式为 `round((命中数 + 创伤额外伤害 + 形状及多组奖励) × 连锁倍率 × 技能倍率)`。连续有效交换达到 3 次后，每次再额外 SP +3；无效交换重置连续命中，技能不推进也不中断连续命中。

特殊宝石被命中时会继续连锁引爆，单轮每颗只触发一次。恶女之瞳可与任意相邻宝石交换清色。开局中央放置一颗恶女之瞳，便于首次演示。

| 特殊交换 | 效果（以交换落点为中心） |
| --- | --- |
| 冲击针 + 冲击针 | 清除一行一列 |
| 冲击针 + 炸弹 | 清除三行三列 |
| 炸弹 + 炸弹 | 引爆 5×5 区域 |
| 恶女之瞳 + 普通宝石 | 清除全盘该颜色 |
| 恶女之瞳 + 冲击针／炸弹 | 该颜色所在位置逐一触发行列扫射／3×3 爆破 |
| 恶女之瞳 + 恶女之瞳 | 清除全盘 |

反馈由每轮唯一的消除事件驱动，重复消除同一位置也会播放。消除提示由独立的 `EliminationNotice` 组件呈现：透明、无底板的描边字、连锁数字和短促切线动效，不拦截棋盘点击；合成提示同样无底板。视觉区分碎光、冲击针光束、炸弹冲击圈、清色连接光线和特殊宝石合成提示；补落宝石显示位移动画。音效使用 Web Audio 本地合成，包含普通命中、四消和弦、五消琶音、六消以上低频、连锁升调、扫射、爆破和共鸣音色，并通过统一压缩器控制叠加音量。支持静音、触屏滑动交换和减少动态效果。

每次有效交换后可释放 1 个技能。技能消耗 SP、不消耗步数、不推进敌方回合，且解除全部锁链。每 4 次有效交换触发敌方反制；锁链可通过相邻消除解除，心火在 3 次有效交换后爆发，每颗扣 18 从容。

消除期间不出现选项弹窗，也不等待剧情确认。右侧立绘使用浅色对话气泡，带说话人、句数与指向人物的尖角；角色切换时立绘及气泡色调一起变化。文字逐字显示，点击人物、气泡正文或“显示全文”先补全当前句，再次点击推进下一句；末句可“回看本段”。默认自动播放在全文显示后留出 3.8 秒阅读时间，可切换手动。减少动态效果时直接显示全文；暂停及隐藏页面时停止文字与自动推进，恢复后重新留足阅读时间。突破心防后切换到该阶段剧情。推进和回看台词不暂停连锁、不消耗资源。阶段台词配置在 `src/data/demo.ts` 的 `phases[].dialogue`，每句包含 `speaker` 和 `text`。最后一步会先完成连锁再判断胜负；最后一重心防归零后也会完成剩余补落和消除，确保结算时没有残留匹配。

成功后先展示独立的“心防击破”结算，进度从 0 增长到 20/100；点击“进入后续剧情”后进入“未说完的话”节点。`src/data/demo.ts` 中的 `breakProgress.initial / successGain / maximum` 与 `nextNode.id / title` 控制进度和节点。重试同一场始终从配置的初始进度计算，未达成不增加进度；跨节点累计和场景奖励去重由主影游管理。

需要限时场景时可在 `src/data/demo.ts` 设置 `timeLimitSeconds`，或用 `/?timed=60` 预览。时钟只统计可操作时间；战前对话、帮助、暂停、隐藏页面及自动消除演出不扣时。战斗中的阶段台词随交锋播放，不暂停可操作时间。操作用时独立记录，不用剩余时限反推。

## 视频预留位置

`src/data/demo.ts` 中的 `media.before` 与 `media.after.success / partial / failure` 为素材入口，当前为空。空地址显示明确标注的剧情占位画面，不发起视频请求。填入同源视频地址后，`FilmSlot` 使用 HTML video 播放；播放结束或点击继续时推进流程。也可以由你自己的影游播放器管理前后视频，直接嵌入玩法。

占位台词只用于演示局部衔接，正式影片的剧情和人物结局由主项目决定。

## 在剧情播放器中调用

```html
<iframe
  id="match3"
  src="http://127.0.0.1:3000/?embed=1&approach=patient&parentOrigin=https%3A%2F%2Ffilm.example"
  title="心防交锋"
  allow="autoplay"
></iframe>
```

`embed=1` 跳过前置占位和开场选择，直接触发入场转场、立绘对话、三消；`approach=patient` 带入 SP 增益，`approach=direct` 降低第一重心防。`parentOrigin` 必须是实际剧情播放器的来源；省略时只向同源父页面发送消息，不使用通配符。生产部署时将 iframe 的地址换成你的实际玩法地址。

```js
const frame = document.getElementById('match3');
const completed = new Map();
const continued = new Set();
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://127.0.0.1:3000') return;
  if (event.source !== frame.contentWindow) return;
  const { type, payload: result } = event.data ?? {};
  if (result?.version !== 1) return;
  if (type === 'xinfang:complete') {
    completed.set(result.runId, result);
    // 记录结果；保留 iframe 展示击破进度，不在此处切走。
  }
  if (type === 'xinfang:continue' && completed.has(result.runId) && !continued.has(result.runId)) {
    continued.add(result.runId);
    // 在此处卸载 iframe，用 nextNodeId / continuationId / storyFlags 选择后续片段。
    // 完整可运行示例见 public/embed-demo.html。
  }
});
```

事件包括 `xinfang:ready`、本局完成一次发送的 `xinfang:complete`，以及点击“进入后续剧情”（未达成时为“回到剧情”）时的 `xinfang:continue`。主播放器等待 continue 后切换节点，确保先展示结算。可按 runId 去重一次尝试；同一剧情节点是否重复发奖由主播放器按场景记录。在同一窗口集成时，可以监听同名 CustomEvent，从 `event.detail` 读取结果。

## 返回结果

结构定义位于 `src/types/demo.ts` 的 `BattleResult`。

| 字段 | 含义 |
| --- | --- |
| `version`、`runId` | 协议版本与本次尝试标识；重试生成新 runId |
| `battleId`、`sceneId` | 玩法与所属剧情场景 |
| `seed` | 本局随机种子；将其传入 `?seed=数字` 可复现开局及同样操作下的补落 |
| `outcome` | `success` 全部破防；`partial` 至少完成一重但中断；`failure` 未完成第一重 |
| `reason` | `defense_broken`、`turn_limit`、`time_limit`、`composure` |
| `grade` | S/A/B/C 战斗表现，与人物最终结局分开 |
| `approach`、`response` | 开场选择；response 为旧接入保留字段，当前始终为 null，战斗中没有选项 |
| `phasesCleared`、`turnsUsed`、`turnsRemaining` | 本场进展与步数 |
| `maxCombo`、`composure`、`activeTimeMs` | 最大连锁、剩余从容、可操作时间 |
| `storyFlags` | 可交给剧情系统的选择与结果标记 |
| `continuationId` | 承接片段标识，由影游项目映射到实际视频 |
| `progressBefore`、`progressDelta`、`breakProgress` | 本场前进度、实际增加值、完成后进度；默认成功为 0、20、20 |
| `nextNodeId` | 下一剧情节点，默认 `consultation-next` |

成功后根据开场选择返回 `consultation.continue.open`（patient）或 `consultation.continue.tense`（direct）；部分达成返回 `consultation.continue.guarded`；未达成返回 `consultation.interrupted`。这些标识用于本场场景，未代表人物最终结局。

最近一场结果独立保存在 `xinfang_demo_last_result_v1`，不改写原项目的角色关卡、教程或结局存档。
