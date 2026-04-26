export interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  groups: string[];
  status?: 'online' | 'offline' | 'checking' | 'unknown';
}

export function parseM3U(content: string): Channel[] {
  const lines = content.split('\n');
  const channels: Channel[] = [];
  let currentChannel: Partial<Channel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const lastCommaIndex = line.lastIndexOf(',');
      let name = 'Unknown';
      if (lastCommaIndex !== -1) {
        name = line.substring(lastCommaIndex + 1).trim();
      }

      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const groupMatch = line.match(/group-title="([^"]+)"/i);

      let groups = ['Lainnya'];
      if (groupMatch && groupMatch[1]) {
        const parts = groupMatch[1].split(/[;,]/).map(s => s.trim()).filter(Boolean);
        if (parts.length > 0) groups = parts;
      }

      currentChannel.name = name
        .replace(/\[.*\]/g, '')
        .replace(/\(.*\)/g, '')
        .replace(/HD|SD|FHD|4K/gi, '')
        .trim() || 'Unknown Channel';

      currentChannel.logo = logoMatch ? logoMatch[1] : '';
      currentChannel.groups = groups;
    } else if (line.startsWith('http')) {
      currentChannel.url = line;
      currentChannel.id = btoa(unescape(encodeURIComponent((currentChannel.name || '') + line))).slice(0, 16);
      channels.push(currentChannel as Channel);
      currentChannel = {};
    }
  }

  return channels;
}
