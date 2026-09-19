/**
 * 生成碎片页（/glimpses）所需的照片索引 src/data/photos-index.json
 *
 * 与《SLOW慢驶2.0执行手册》1.3 / 4.1 的差异（原写法会失败或产生错误结果）：
 *
 * 1. 用已装的 exif-parser，不引入 exifreader。
 *    项目用 npm（只有 package-lock.json），文档的 pnpm add 会产生第二套锁文件；
 *    且 exif-parser 已在 extract-exif.js 中验证可用（288 张里成功读出 285 张 EXIF）。
 *
 * 2. 【修正 Part 4 的优先级 bug】文档 4.1 把「旧 photos-index.json」排在
 *    CMS 元数据之前，导致首次构建后 json 里已有该 slug，之后在 TinaCMS
 *    里改的任何值都会被旧 json 覆盖、永远不生效。
 *    这里改为正确语义：CMS 元数据 > 旧 json > EXIF 自动提取。
 *
 * 3. CMS 元数据源用现有的 src/content/photos/*.mdx，而不是文档 Part 2 要求
 *    新建的 content/photos/*.json。原因：Part 2 的 defineSchema/TinaProvider
 *    在你当前的 @tinacms/cli 2.1.1 + tinacms 3.13 里都不存在，且 Astro 未装
 *    @astrojs/react 无法渲染 admin.tsx。复用现有 mdx 即可达到同样目的，
 *    不必引入第二套会冲突的后台配置。
 *
 * 4. exif-parser 的 DateTimeOriginal 是 Unix 秒（不是文档假设的 "YYYY:MM:DD" 字符串），
 *    FNumber/FocalLength 是数值而非带单位的字符串，故需自行格式化。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import exifParser from 'exif-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = path.join(__dirname, '../public/photos');
const CMS_DIR = path.join(__dirname, '../src/content/photos');
const DATA_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'photos-index.json');

/** 极简 frontmatter 解析：只取本项目用到的两层结构，不为此多装 yaml 依赖 */
function parseFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!m) return {};
  const data = {};
  let obj = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const kv = /^(\s*)([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, , key, val] = kv;
    const indent = kv[1].length;
    if (indent === 0) {
      if (val === '') { obj = key; data[key] = {}; }
      else { obj = null; data[key] = unquote(val); }
    } else if (obj && typeof data[obj] === 'object') {
      data[obj][key] = unquote(val);
    }
  }
  return data;
}

function unquote(v) {
  const s = v.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    try { return JSON.parse(s); } catch { return s.slice(1, -1); }
  }
  return s;
}

/** 去掉空字符串字段，避免用 '' 覆盖掉已有的有效值 */
function compact(o) {
  const r = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === '' || v === null || v === undefined) continue;
    r[k] = v;
  }
  return r;
}

function readCmsMeta() {
  const map = new Map();
  if (!fs.existsSync(CMS_DIR)) return map;
  for (const f of fs.readdirSync(CMS_DIR)) {
    if (!/\.mdx?$/i.test(f)) continue;
    const slug = f.replace(/\.[^/.]+$/, '');
    try {
      const d = parseFrontmatter(fs.readFileSync(path.join(CMS_DIR, f), 'utf8'));
      // mdx 的字段名映射到碎片页字段名
      map.set(slug, compact({
        title: d.title,
        description: d.description,
        location: d.location,
        tags: Array.isArray(d.tags) && d.tags.length ? d.tags : undefined,
        // date 形如 2026-08-15，取年份
        year: typeof d.date === 'string' && /^\d{4}/.test(d.date) ? d.date.slice(0, 4) : '',
        camera: d.exif?.camera,
        aperture: d.exif?.aperture,
        focalLength: d.exif?.focalLength,
        shutterSpeed: d.exif?.shutterSpeed,
        iso: d.exif?.iso,
        lens: d.exif?.lens,
      }));
    } catch { /* 单个文件损坏不应中断整批 */ }
  }
  return map;
}

function readExif(filePath) {
  try {
    const tags = exifParser.create(fs.readFileSync(filePath)).parse().tags || {};

    const make = String(tags.Make || '').trim();
    const model = String(tags.Model || '').trim();
    // 只用 Model 会丢掉品牌（得到 "A7R IV"），拼上 Make 才完整；型号已含品牌则不重复
    const camera = !model ? make
      : (!make || model.toLowerCase().startsWith(make.toLowerCase())) ? model : `${make} ${model}`;

    const fn = Number(tags.FNumber);
    const fl = Number(tags.FocalLength);
    // Orientation 1-4 为横向，5-8 为竖向
    const ori = Number(tags.Orientation);

    /**
     * DateTimeOriginal 是 Unix 秒。它存在但无效（0、NaN、超出合理范围）时，
     * new Date(NaN).getFullYear() 会得到 NaN，String() 后变成字符串 "NaN"——
     * 这不是空串，compact() 的空值过滤和页面的 filter(Boolean) 都拦不住，
     * 最终会在筛选下拉框里出现一个 "NaN" 选项。故显式校验年份有效性。
     */
    const ts = Number(tags.DateTimeOriginal);
    const yr = Number.isFinite(ts) && ts > 0
      ? new Date(ts * 1000).getFullYear()
      : NaN;

    const brand = make || (model ? model.split(' ')[0] : '');

    return compact({
      year: Number.isInteger(yr) && yr >= 1900 && yr <= 2100 ? String(yr) : '',
      camera,
      // 品牌同样过滤掉 "NaN"/"undefined" 这类非预期字符串，避免污染筛选器
      brand: /^(NaN|undefined|null)$/i.test(brand) ? '' : brand,
      aperture: fn && !Number.isNaN(fn)
        ? `f/${Number.isInteger(fn) ? fn : Math.round(fn * 10) / 10}` : '',
      focalLength: fl && !Number.isNaN(fl)
        ? `${Number.isInteger(fl) ? fl : Math.round(fl * 10) / 10}mm` : '',
      orientation: ori > 4 ? 'portrait' : 'landscape',
    });
  } catch {
    return {};
  }
}

function generateIndex() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.warn('[index] public/photos 不存在，跳过。');
    return;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const cms = readCmsMeta();

  let prev = new Map();
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      for (const it of JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'))) prev.set(it.slug, it);
    } catch { console.warn('[index] 旧 photos-index.json 解析失败，忽略。'); }
  }

  const files = fs
    .readdirSync(PHOTOS_DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort();

  const out = [];
  let withExif = 0;

  for (const file of files) {
    const slug = file.replace(/\.[^/.]+$/, '');
    const exif = readExif(path.join(PHOTOS_DIR, file));
    if (exif.camera) withExif++;

    // 优先级：CMS 手改 > 上一次索引 > EXIF 自动提取
    out.push({
      slug,
      src: `/photos/${file}`,
      // src 必须最后写，防止被任一数据源里的同名字段覆盖成坏路径
      ...exif,
      ...(prev.get(slug) || {}),
      ...cms.get(slug) || {},
      slug,
      src: `/photos/${file}`,
      // 标题兜底：没有任何来源时把文件名美化成可读标题
      title: cms.get(slug)?.title || prev.get(slug)?.title
        || slug.split(/[-_]+/).filter(Boolean)
             .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      orientation: exif.orientation || prev.get(slug)?.orientation || 'landscape',
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2));
  console.log(`[index] 生成照片索引 ${out.length} 张（含 EXIF ${withExif} 张，CMS 元数据 ${cms.size} 条）-> src/data/photos-index.json`);
}

generateIndex();
