export interface Channel {
  id: string;
  name: string;
  group: string;
  logo: string | null;
  url: string;
  status?: 'unknown' | 'online' | 'offline' | 'checking';
}

export function parseM3U(text: string): Channel[] {
  const lines = text.split('\n');
  const results: Channel[] = [];
  let currentItem: Partial<Channel> = {};

  lines.forEach((line) => {
    line = line.trim();
    if (line.startsWith('#EXTINF:')) {
      const info = line.split('#EXTINF:')[1];
      const name = info.split(',').pop()?.trim() || 'Unknown Channel';
      const group = info.match(/group-title="([^"]+)"/)?.[1] || 'Other';
      const logo = info.match(/tvg-logo="([^"]+)"/)?.[1] || null;
      
      currentItem = { 
        name, 
        group, 
        logo,
        id: btoa(unescape(encodeURIComponent(name + (line.startsWith('http') ? line : '')))).substring(0, 24)
      };
    } else if (line.startsWith('http') && currentItem.name) {
      currentItem.url = line;
      // Re-calculate ID with the actual URL for better uniqueness
      currentItem.id = btoa(unescape(encodeURIComponent(currentItem.name + line))).substring(0, 24);
      results.push(currentItem as Channel);
      currentItem = {};
    }
  });

  return results;
}
