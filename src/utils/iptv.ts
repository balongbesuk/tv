export interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  group: string;
  status?: 'online' | 'offline' | 'checking' | 'unknown';
  epgId?: string;
  currentProgram?: {
    title: string;
    start: string;
    stop: string;
    desc?: string;
  };
}

export function parseM3U(content: string): Channel[] {
  const lines = content.split('\n');
  const channels: Channel[] = [];
  let currentChannel: Partial<Channel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Improved name extraction: find the LAST comma
      const lastCommaIndex = line.lastIndexOf(',');
      let name = 'Unknown';
      if (lastCommaIndex !== -1) {
        name = line.substring(lastCommaIndex + 1).trim();
      }

      // Extract metadata
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      const idMatch = line.match(/tvg-id="([^"]+)"/);

      // Clean name from common tags like [Geo-blocked], (HD), etc.
      currentChannel.name = name
        .replace(/\[.*\]/g, '')
        .replace(/\(.*\)/g, '')
        .replace(/HD|SD|FHD|4K/gi, '')
        .trim() || 'Unknown Channel';

      currentChannel.logo = logoMatch ? logoMatch[1] : '';
      currentChannel.group = groupMatch ? groupMatch[1] : 'Lainnya';
      currentChannel.epgId = idMatch ? idMatch[1] : '';
    } else if (line.startsWith('http')) {
      currentChannel.url = line;
      // Stable ID: name + url hash
      currentChannel.id = btoa(unescape(encodeURIComponent((currentChannel.name || '') + line))).slice(0, 16);
      channels.push(currentChannel as Channel);
      currentChannel = {};
    }
  }

  return channels;
}

export interface EPGProgram {
  title: string;
  start: Date;
  stop: Date;
  desc?: string;
  channel: string;
}

export function parseXMLTV(xmlText: string): Record<string, EPGProgram[]> {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const programs = xmlDoc.getElementsByTagName("programme");
  const epgData: Record<string, EPGProgram[]> = {};

  for (let i = 0; i < programs.length; i++) {
    const prog = programs[i];
    const channelId = prog.getAttribute("channel") || "";
    const startStr = prog.getAttribute("start") || "";
    const stopStr = prog.getAttribute("stop") || "";
    const title = prog.getElementsByTagName("title")[0]?.textContent || "No Title";
    const desc = prog.getElementsByTagName("desc")[0]?.textContent || "";

    const start = parseXMLTVDate(startStr);
    const stop = parseXMLTVDate(stopStr);

    if (!epgData[channelId]) epgData[channelId] = [];
    epgData[channelId].push({ title, start, stop, desc, channel: channelId });
  }

  return epgData;
}

function parseXMLTVDate(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const hour = parseInt(dateStr.substring(8, 10));
  const min = parseInt(dateStr.substring(10, 12));
  const sec = parseInt(dateStr.substring(12, 14));
  
  return new Date(Date.UTC(year, month, day, hour, min, sec));
}
