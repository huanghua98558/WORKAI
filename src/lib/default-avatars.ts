/**
 * 默认头像生成器
 * 提供多个预设的SVG头像供用户选择
 */

export interface DefaultAvatar {
  id: string;
  name: string;
  svg: string;
  preview: string; // Base64 encoded preview
}

// 预设的颜色方案
const COLOR_SCHEMES = [
  { bg: '#3B82F6', text: '#FFFFFF' }, // 蓝色
  { bg: '#10B981', text: '#FFFFFF' }, // 绿色
  { bg: '#F59E0B', text: '#FFFFFF' }, // 橙色
  { bg: '#EF4444', text: '#FFFFFF' }, // 红色
  { bg: '#8B5CF6', text: '#FFFFFF' }, // 紫色
  { bg: '#EC4899', text: '#FFFFFF' }, // 粉色
  { bg: '#06B6D4', text: '#FFFFFF' }, // 青色
  { bg: '#6366F1', text: '#FFFFFF' }, // 靛蓝
];

// 图案样式
const PATTERNS = [
  'circles',    // 圆形图案
  'waves',      // 波浪图案
  'grid',       // 网格图案
  'gradient',   // 渐变背景
  'dots',       // 点状图案
];

/**
 * 生成圆形图案SVG
 */
function generateCirclesPattern(bg: string, text: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${bg}"/>
    <circle cx="50" cy="50" r="30" fill="${text}" opacity="0.1"/>
    <circle cx="50" cy="50" r="20" fill="${text}" opacity="0.2"/>
    <circle cx="50" cy="50" r="10" fill="${text}" opacity="0.3"/>
  </svg>`;
}

/**
 * 生成波浪图案SVG
 */
function generateWavesPattern(bg: string, text: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${bg}"/>
    <path d="M0 70 Q25 60 50 70 T100 70 V100 H0 Z" fill="${text}" opacity="0.15"/>
    <path d="M0 80 Q25 70 50 80 T100 80 V100 H0 Z" fill="${text}" opacity="0.25"/>
    <path d="M0 90 Q25 80 50 90 T100 90 V100 H0 Z" fill="${text}" opacity="0.35"/>
  </svg>`;
}

/**
 * 生成网格图案SVG
 */
function generateGridPattern(bg: string, text: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${bg}"/>
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${text}" stroke-width="1" opacity="0.15"/>
      </pattern>
    </defs>
    <rect width="100" height="100" fill="url(#grid)"/>
    <rect x="30" y="30" width="40" height="40" fill="${text}" opacity="0.1"/>
  </svg>`;
}

/**
 * 生成渐变背景SVG
 */
function generateGradientPattern(bg: string, text: string): string {
  const lighterColor = adjustBrightness(bg, 20);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${bg};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${lighterColor};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#grad)"/>
    <circle cx="50" cy="50" r="25" fill="${text}" opacity="0.15"/>
  </svg>`;
}

/**
 * 生成点状图案SVG
 */
function generateDotsPattern(bg: string, text: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${bg}"/>
    <circle cx="25" cy="25" r="5" fill="${text}" opacity="0.2"/>
    <circle cx="75" cy="25" r="5" fill="${text}" opacity="0.2"/>
    <circle cx="25" cy="75" r="5" fill="${text}" opacity="0.2"/>
    <circle cx="75" cy="75" r="5" fill="${text}" opacity="0.2"/>
    <circle cx="50" cy="50" r="8" fill="${text}" opacity="0.25"/>
  </svg>`;
}

/**
 * 调整颜色亮度
 */
function adjustBrightness(hex: string, amount: number): string {
  const color = hex.replace('#', '');
  const num = parseInt(color, 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
  const b = Math.min(255, (num & 0x0000FF) + amount);
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

/**
 * 生成所有默认头像
 */
export function generateDefaultAvatars(): DefaultAvatar[] {
  const avatars: DefaultAvatar[] = [];

  COLOR_SCHEMES.forEach((scheme, colorIndex) => {
    PATTERNS.forEach((pattern, patternIndex) => {
      let svg = '';
      let patternName = '';

      switch (pattern) {
        case 'circles':
          svg = generateCirclesPattern(scheme.bg, scheme.text);
          patternName = '圆形';
          break;
        case 'waves':
          svg = generateWavesPattern(scheme.bg, scheme.text);
          patternName = '波浪';
          break;
        case 'grid':
          svg = generateGridPattern(scheme.bg, scheme.text);
          patternName = '网格';
          break;
        case 'gradient':
          svg = generateGradientPattern(scheme.bg, scheme.text);
          patternName = '渐变';
          break;
        case 'dots':
          svg = generateDotsPattern(scheme.bg, scheme.text);
          patternName = '点状';
          break;
      }

      const id = `default-${colorIndex}-${patternIndex}`;
      const name = `${getColorName(scheme.bg)}${patternName}`;

      avatars.push({
        id,
        name,
        svg,
        preview: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      });
    });
  });

  return avatars;
}

/**
 * 获取颜色名称
 */
function getColorName(hex: string): string {
  const colorMap: Record<string, string> = {
    '#3B82F6': '蓝色',
    '#10B981': '绿色',
    '#F59E0B': '橙色',
    '#EF4444': '红色',
    '#8B5CF6': '紫色',
    '#EC4899': '粉色',
    '#06B6D4': '青色',
    '#6366F1': '靛蓝',
  };
  return colorMap[hex] || '多彩';
}

/**
 * 根据用户名生成默认头像
 */
export function generateAvatarForUser(username: string): string {
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % COLOR_SCHEMES.length;
  const patternIndex = Math.floor(hash / COLOR_SCHEMES.length) % PATTERNS.length;

  const scheme = COLOR_SCHEMES[colorIndex];
  const pattern = PATTERNS[patternIndex];

  let svg = '';
  switch (pattern) {
    case 'circles':
      svg = generateCirclesPattern(scheme.bg, scheme.text);
      break;
    case 'waves':
      svg = generateWavesPattern(scheme.bg, scheme.text);
      break;
    case 'grid':
      svg = generateGridPattern(scheme.bg, scheme.text);
      break;
    case 'gradient':
      svg = generateGradientPattern(scheme.bg, scheme.text);
      break;
    case 'dots':
      svg = generateDotsPattern(scheme.bg, scheme.text);
      break;
  }

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// 导出默认头像列表
export const DEFAULT_AVATARS = generateDefaultAvatars();
