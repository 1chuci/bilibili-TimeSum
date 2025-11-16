Bilibili-TimeSum
一个简洁的网页工具，用于快速计算 Bilibili 视频合集或播放列表的总时长。

在您准备“入坑”一个几十集的学习视频或番剧之前，用它来估算一下总“肝度”吧！

[➡️ 在线体验](https://timesum.pages.dev/)  （请替换为您的实际部署链接）

✨ 主要特性
一键计算：快速计算 B 站视频合集的总时长。
操作简单：只需两步，从获取数据到得出结果。
纯净体验：纯前端实现，界面简洁，无广告。
部署轻松：静态页面，可以轻松部署在 Cloudflare Pages、Vercel 等任意静态托管平台。
🚀 如何使用
第一步：从 B 站页面获取时长数据
在浏览器中打开您想要计算的 Bilibili 视频合集播放页面。
按下 F12 键，打开浏览器的“开发者工具”。
找到并点击“控制台”（Console）选项卡。
将下方的代码完整复制并粘贴到控制台中，然后按下 Enter 键。
// 这段代码会抓取当前播放列表所有视频的时长
const durations = [...document.querySelectorAll('div.stat-item.duration')].map(el => el.textContent.trim());

// 为了方便复制，我们将其转换为格式化的 JSON 字符串
console.log(JSON.stringify(durations, null, 2));
第二步：计算总时长
执行完上面的脚本后，控制台会输出一个包含所有时长的列表。请将这个列表完整复制。
打开 Bilibili-TimeSum 计算器页面。
将您刚刚复制的内容粘贴到页面的文本框中。
点击“计算总时长”按钮，总时长将立即显示出来！
