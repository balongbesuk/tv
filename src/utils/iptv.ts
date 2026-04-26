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

  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  };

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
      const tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);

      let groups = ['Lainnya'];
      if (groupMatch && groupMatch[1]) {
        const parts = groupMatch[1].split(/[;,]/).map(s => s.trim()).filter(Boolean);
        if (parts.length > 0) groups = parts;
      }

      let cleanName = name
        .replace(/\[.*\]/g, '')
        .replace(/\(.*\)/g, '')
        .replace(/HD|SD|FHD|4K/gi, '')
        .trim();
      
      // Fallback to tvg-name if display name is generic or empty
      if ((!cleanName || cleanName.toUpperCase() === 'LAINNYA' || cleanName.toUpperCase() === 'UNKNOWN') && tvgNameMatch) {
        cleanName = tvgNameMatch[1];
      }

      currentChannel.name = cleanName || 'Unknown Channel';
      currentChannel.logo = logoMatch ? logoMatch[1] : '';
      currentChannel.groups = groups;
    } else if (line.startsWith('http')) {
      currentChannel.url = line;
      // Combined hash to prevent collisions on similar URLs/Names
      const seed = (currentChannel.name || '') + line;
      currentChannel.id = getHash(seed) + getHash(line.split('').reverse().join('')); 
      channels.push(currentChannel as Channel);
      currentChannel = {};
    }
  }

  return channels;
}
