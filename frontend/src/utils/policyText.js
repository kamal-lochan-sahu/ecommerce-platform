// Admin ke Store Pages ka simple text -> blocks. Koi HTML nahi chalta (React text ko escape karta hai),
// isliye admin kuch bhi likhe, page safe rehta hai.
//   "## Heading"  -> heading
//   "- item"      -> bullet list
//   khali line    -> naya paragraph
export const parsePolicyText = (text) => {
  const blocks = [];
  let para = [];
  let list = [];
  const flushPara = () => { if (para.length) { blocks.push({ type: 'p', text: para.join('\n') }); para = []; } };
  const flushList = () => { if (list.length) { blocks.push({ type: 'ul', items: list }); list = []; } };

  for (const raw of String(text || '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    if (line.startsWith('## ')) { flushPara(); flushList(); blocks.push({ type: 'h', text: line.slice(3).trim() }); continue; }
    if (line.startsWith('- ')) { flushPara(); list.push(line.slice(2).trim()); continue; }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
};
