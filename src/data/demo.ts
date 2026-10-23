import type { Approach, DemoConfig, DialogueLine } from '../types/demo';
// One encounter inserted between two film scenes. Final story endings belong to the film.
export const DEMO_CONFIG: DemoConfig = {
  id: 'yuchi-consultation-demo', sceneId: 'consultation-middle',
  title: '这一次，听我说完', objective: '突破三重心防，让这场会谈继续。',
  seed: 20261020, turns: 18, timeLimitSeconds: null,
  phases: [
    { name: '试探', defense: 24, quote: '“你总是把话题引回我身上。那你呢？”', dialogue: [
      { speaker: 'target', text: '你每次都在拆解我的话。就不能当作一个玩笑？' },
      { speaker: 'heroine', text: '玩笑我听见了。我还想听见你没有说出口的那一半。' },
    ] },
    { name: '动摇', defense: 40, quote: '“别再用那副什么都明白的眼神看我。”', dialogue: [
      { speaker: 'target', text: '如果我不想回答呢？你是不是也会替我下结论？' },
      { speaker: 'heroine', text: '我不替你下结论。你只要别再用玩笑替自己回答。' },
      { speaker: 'target', text: '……你还真是，一点也不肯放过我。' },
    ] },
    { name: '回应', defense: 56, quote: '“……这一次，你会把我的话听完吗？”', dialogue: [
      { speaker: 'target', text: '其实，刚才那句话……我还没说完。' },
      { speaker: 'heroine', text: '那就把剩下的话告诉我。我在这里。' },
      { speaker: 'target', text: '好。这一次，我不躲。' },
    ] },
  ],
  breakProgress: { initial: 0, successGain: 20, maximum: 100 },
  nextNode: { id: 'consultation-next', title: '未说完的话' },
  media: { before: '', after: { success: '', partial: '', failure: '' } },
};
export const DEMO_CHARACTER = {
  name: '裴予迟', portrait: '/assets/aistudio/yuchi_transparent.png',
  avatar: '/assets/aistudio/ff5b0d44690e58b29adf27c2e1c5ec53_edd7ce8f.jpg',
};
export const DEMO_HEROINE = { name: '陆星河', portrait: '/assets/aistudio/yanchen_transparent.png' };
export const OPENING_DIALOGUE: Record<Approach, DialogueLine[]> = {
  direct: [
    { speaker: 'heroine', text: '你每次都在最重要的地方转移话题。' },
    { speaker: 'target', text: '如果我不回答，你是不是已经替我下好结论了？' },
    { speaker: 'heroine', text: '结论由你自己说。现在，先别急着移开视线。' },
  ],
  patient: [
    { speaker: 'heroine', text: '不急着回答。今天，我们可以慢一点。' },
    { speaker: 'target', text: '……你真打算一直等到我开口？' },
    { speaker: 'heroine', text: '我想听你说完，而不是听你把话题推开。' },
  ],
};
export const APPROACHES = [
  { id: 'direct' as const, title: '直面他的回避', line: '“你每次都在最重要的地方转移话题。”', effect: '第一重心防降低 20%', reaction: '他收起笑意，终于迎上你的目光。' },
  { id: 'patient' as const, title: '先给他一点余地', line: '“不急着回答。今天，我们可以慢一点。”', effect: '初始 SP +25，首消后可用技能', reaction: '他没有接话，却也没有再起身离开。' },
];
