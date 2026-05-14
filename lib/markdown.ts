export function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-100 mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-100 mt-4 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-100 mt-4 mb-2">$1</h1>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-100 font-semibold">$1</strong>');

  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-200">$1</li>');

  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('<li ')) {
      if (!inList) {
        result.push('<ul class="my-1 space-y-0.5">');
        inList = true;
      }
      result.push(line);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (line === '') {
        result.push('<br />');
      } else if (!line.startsWith('<h') && !line.startsWith('<strong')) {
        result.push(line ? `<p class="text-gray-200">${line}</p>` : '');
      } else {
        result.push(line);
      }
    }
  }
  if (inList) result.push('</ul>');

  return result.join('\n');
}
