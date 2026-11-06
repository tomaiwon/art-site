// ============================================================
//  内容配置：改这里就能换标题、章节、配色、图注、音色
//  照片直接读网站里的 images/film-practice-2026/<folder>/
//  照片尺寸和色板在 photos.gen.js（由 tools/build.py 生成）
// ============================================================

export const SITE = {
  logo: 'YI HUANG',
  logoTag: 'FILM',
  year: '2026',
  // 首页中间的粒子大字
  hero: 'FILM',
  heroLine: 'PRACTICE / 05 — 08 / 2026',
  // 首页红色文字块
  kicker: 'PRACTICE / 26',
  slogan: 'LIGHT, KEPT ON FILM',
  // 首页深色信息块
  darkKicker: '胶片的记录',
  darkBig: '胶片',
  footer: 'A FILM JOURNAL',
  // 默认强调色（首页）
  accent: '#E0461E',
  // 照片所在文件夹（相对这个页面）
  photoRoot: '../../images/film-practice-2026/',
  // 回到主站：桌面回作品页的「过往实践」，手机回移动版首页
  backDesktop: '../../work.html#practice',
  backMobile: '../../mobile.html',
};

// 风格切换：1–4 键
export const STYLES = [
  { id: 'original', zh: '原图', en: 'Original' },
  { id: 'ink', zh: '油墨', en: 'Ink' },
  { id: 'halftone', zh: '网点', en: 'Halftone' },
  { id: 'blocks', zh: '色块', en: 'Blocks' },
];

// 章节 = 一卷胶片。顺序就是网站里的顺序。
//   id       网址里的名字（#/ch/<id>）
//   folder   照片文件夹名（photoRoot 下面）
//   key      粒子大字 & 英文标题
//   title    你自己的作品标题
//   sound    音色：meadow 草地 / sea 海 / dust 尘土 / glass 玻璃（见 sound.js）
//   featured 出现在首页拼贴里的照片编号
//   captions 图注；没写的照片显示「城市 · 第 N 格」
export const CHAPTERS = [
  {
    id: 'cambridge',
    folder: 'cambridge-2026',
    key: 'CAMBRIDGE',
    title: '洋务时刻',
    city: '剑桥',
    date: '2026.05',
    intro: '五月的河、草地和网球场。',
    accent: '#3B7A47',
    sound: 'meadow',
    featured: ['002', '003', '006', '008', '014'],
    captions: {
      '001': '河边的露台坐满了人。',
      '002': '撑篙的人站在船尾，一船人顺流而下。',
      '003': '船从木桥底下钻过去。',
      '004': '隔着铁丝网看一场网球。',
      '006': '林荫道，树影一路铺到尽头。',
      '008': '草地上的人，各自晒着自己的下午。',
      '011': '草被晒成了金色。',
      '014': '红椅子等着下一个人坐下。',
    },
  },
  {
    id: 'marseille',
    folder: 'marseille-2026',
    key: 'MARSEILLE',
    title: '晒后假日下',
    city: '马赛',
    date: '2026.07',
    intro: '坐船出港，沿着峡湾一路晒到海边。',
    accent: '#1A7FA8',
    sound: 'sea',
    featured: ['001', '004', '008', '021', '026'],
    captions: {
      '001': '从船舷回头看旧港。',
      '004': '一艘帆船停在白色的岩壁下。',
      '007': '逆光里，海面碎成一片。',
      '008': '甲板上，每个人都举着手机。',
      '013': '船尾拖出一道白浪。',
      '016': '回到港口，人挤着人。',
      '021': '峡湾尽头，船挤在一小片海滩前。',
      '026': '悬崖往下，海是深蓝色的。',
      '032': '松树底下，晒后的一张自己。',
    },
  },
  {
    id: 'arles',
    folder: 'arles-2026',
    key: 'ARLES',
    title: '摄影术二百年',
    city: '阿尔勒',
    date: '2026.07',
    intro: '罗讷河、斗牛场、夜路，最后换上一卷黑白。',
    accent: '#C4621B',
    sound: 'dust',
    featured: ['002', '022', '030', '040', '043', '060', '070'],
    captions: {
      '002': '罗讷河在这里拐了个弯。',
      '013': '斗牛场还空着。',
      '022': '斗牛场里，所有人都看着同一个方向。',
      '030': '夜里的巷子，只剩路灯是黄色的。',
      '036': '河岸的灯一盏接一盏亮起来。',
      '040': '地上的红字：曝光，写了好几种语言。',
      '043': '一台木头大画幅，和它的主人。',
      '052': '换上黑白卷。',
      '060': '墙上的海报，也变成了黑白。',
      '064': '一座塔，和塔下的一个人。',
      '070': '回廊里，黑白比彩色更安静。',
    },
  },
  {
    id: 'venice',
    folder: 'venice-2026',
    key: 'VENICE',
    title: '双年展',
    city: '威尼斯',
    date: '2026.08',
    intro: '运河之间，双年展藏在军械库的拱门下面。',
    accent: '#B23A3A',
    sound: 'glass',
    featured: ['001', '007', '015', '019', '033'],
    captions: {
      '001': '运河从两排房子中间穿过去。',
      '007': '黄色的餐厅，白桌布等着午饭。',
      '015': '粉色的房子，门口泊着一艘白船。',
      '019': '拱门下的水面，倒映着一块红色屏幕。',
      '021': '一排拱门，一排倒影。',
      '029': '石柱之间，白色的装置像一顶帐篷。',
      '033': '黑暗里浮着几张金色的脸。',
    },
  },
];
