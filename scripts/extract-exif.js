/**
 * EXIF 自动提取脚本（ESM 版本）
 *
 * 与原集成指南的差异（原写法会失败或产生错误结果）：
 * 1. 用 import 而非 require —— package.json 是 "type": "module"，
 *    require 在 ESM 上下文直接抛 ReferenceError。
 * 2. camera 用 Make + Model 拼接 —— 只用 tags.Model 会得到 "A7R IV"，丢掉品牌。
 * 3. lens 回退 LensMake —— 部分镜头只写厂商不写型号。
 * 4. 补回 focalLength —— 原脚本漏了焦距，而详情页要展示这一项。
 * 5. 长曝光处理 —— ExposureTime >= 1s 时不能写成 "1/1s"。
 * 6. 【重要】增量写入 —— 原脚本每次构建无条件覆盖 .mdx，
 *    会把你在 TinaCMS 后台填好的标题、地点、简介全部清空。
 *    这里改为：文件已存在时只用 EXIF 填充"空字段"，已有内容一律保留。
 *
 * 用法：node scripts/extract-exif.js
 *      （已接入 package.json 的 build，构建前自动执行）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import exifParser from 'exif-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PHOTOS_DIR = path.join(ROOT, 'public', 'photos');
const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'photos');

/** 把字符串安全地写进 YAML 双引号值里 */
function yq(value) {
  return JSON.stringify(String(value ?? ''));
}

/**
 * 极简 frontmatter 解析。
 * 只处理本项目用到的两层结构（顶层标量 + exif 对象），
 * 不引入 yaml 依赖，避免为构建脚本多装一个包。
 */
function parseFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!m) return { data: {}, body: raw };

  const lines = m[1].split(/\r?\n/);
  const data = {};
  let currentObj = null;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.match(/^\s*/)[0].length;
    const kv = /^(\s*)([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;

    const [, , key, rawVal] = kv;

    if (indent === 0) {
      if (rawVal === '') {
        // 嵌套对象开始（如 exif:）
        currentObj = key;
        data[key] = {};
      } else {
        currentObj = null;
        data[key] = unquote(rawVal);
      }
    } else if (currentObj && typeof data[currentObj] === 'object') {
      data[currentObj][key] = unquote(rawVal);
    }
  }

  return { data, body: raw.slice(m[0].length) };
}

function unquote(v) {
  const s = v.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    try {
      return JSON.parse(s);
    } catch {
      return s.slice(1, -1);
    }
  }
  return s;
}

/** 仅当现有值为空时才填入新值，保护用户已编辑的内容 */
function fillEmpty(current, fallback) {
  const cur = current == null ? '' : String(current).trim();
  return cur === '' ? String(fallback ?? '') : cur;
}

/** 从 EXIF 组装相机名：品牌 + 型号，避免 "SONY SONY A7R IV" 这种重复 */
function buildCamera(tags) {
  const make = String(tags.Make || '').trim();
  const model = String(tags.Model || '').trim();
  if (!make && !model) return '';
  if (!model) return make;
  if (!make) return model;
  // 型号里已含品牌名就不再重复
  return model.toLowerCase().startsWith(make.toLowerCase())
    ? model
    : `${make} ${model}`;
}

function buildLens(tags) {
  const lens = String(tags.LensModel || '').trim();
  if (lens) return lens;
  return String(tags.LensMake || '').trim();
}

function buildAperture(fNumber) {
  if (!fNumber || Number.isNaN(Number(fNumber))) return '';
  const n = Number(fNumber);
  // f/2 而非 f/2.0；f/2.8 保留一位
  const s = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  return `f/${s}`;
}

function buildShutter(exposureTime) {
  const t = Number(exposureTime);
  if (!t || Number.isNaN(t) || t <= 0) return '';
  if (t >= 1) {
    // 长曝光：1.5s / 2s，不要写成 "1/1s"
    return `${Number.isInteger(t) ? t : Math.round(t * 10) / 10}s`;
  }
  return `1/${Math.round(1 / t)}s`;
}

function buildFocalLength(v) {
  const n = Number(v);
  if (!n || Number.isNaN(n)) return '';
  return `${Number.isInteger(n) ? n : Math.round(n * 10) / 10}mm`;
}

/** exif-parser 的 DateTimeOriginal 是 Unix 秒，转成 YYYY-MM-DD */
function buildDate(unixSeconds) {
  if (!unixSeconds) return '';
  const d = new Date(Number(unixSeconds) * 1000);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/** 把标题从文件名美化：sunset-at-xiangshan -> Sunset At Xiangshan */
function humanize(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function serialize(data) {
  const exif = data.exif || {};
  return `---
title: ${yq(data.title)}
image: ${yq(data.image)}
date: ${yq(data.date)}
location: ${yq(data.location)}
description: ${yq(data.description)}
showQrCode: ${data.showQrCode ? 'true' : 'false'}
qrLogo: ${yq(data.qrLogo)}
exif:
  camera: ${yq(exif.camera)}
  lens: ${yq(exif.lens)}
  focalLength: ${yq(exif.focalLength)}
  aperture: ${yq(exif.aperture)}
  shutterSpeed: ${yq(exif.shutterSpeed)}
  iso: ${yq(exif.iso)}
---
${data.body || ''}`.replace(/\s+$/, '') + '\n';
}

function extractFromFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = exifParser.create(buffer).parse();
    const tags = result.tags || {};
    return {
      ok: true,
      camera: buildCamera(tags),
      lens: buildLens(tags),
      focalLength: buildFocalLength(tags.FocalLength),
      aperture: buildAperture(tags.FNumber),
      shutterSpeed: buildShutter(tags.ExposureTime),
      iso: tags.ISO ? `ISO ${Number(tags.ISO)}` : '',
      date: buildDate(tags.DateTimeOriginal),
    };
  } catch {
    return { ok: false };
  }
}

function main() {
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`[exif] 照片目录不存在: ${PHOTOS_DIR}`);
    process.exit(1);
  }
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const files = fs
    .readdirSync(PHOTOS_DIR)
    .filter((f) => /\.(jpe?g|png|webp|tiff?)$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.warn('[exif] public/photos 下没有图片，跳过。');
    return;
  }

  let created = 0;
  let updated = 0;
  let withExif = 0;
  let noExif = 0;

  for (const file of files) {
    const slug = path.basename(file, path.extname(file));
    const filePath = path.join(PHOTOS_DIR, file);
    const mdxPath = path.join(CONTENT_DIR, `${slug}.mdx`);
    const exif = extractFromFile(filePath);

    if (exif.ok && exif.camera) withExif++;
    else noExif++;

    let data = {
      title: '',
      image: `/photos/${file}`,
      date: '',
      location: '',
      description: '',
      showQrCode: true,
      qrLogo: '',
      exif: {},
      body: '',
    };

    if (fs.existsSync(mdxPath)) {
      // 已存在：保留用户内容，只用 EXIF 填空
      const parsed = parseFrontmatter(fs.readFileSync(mdxPath, 'utf8'));
      data = { ...data, ...parsed.data, exif: { ...(data.exif), ...(parsed.data.exif || {}) }, body: parsed.body };
      data.image = data.image || `/photos/${file}`;
      if (typeof data.showQrCode !== 'boolean') data.showQrCode = data.showQrCode !== false;
      updated++;
    } else {
      data.title = humanize(slug);
      data.body = '';
      created++;
    }

    if (exif.ok) {
      data.title = fillEmpty(data.title, humanize(slug));
      data.date = fillEmpty(data.date, exif.date);
      data.exif.camera = fillEmpty(data.exif.camera, exif.camera);
      data.exif.lens = fillEmpty(data.exif.lens, exif.lens);
      data.exif.focalLength = fillEmpty(data.exif.focalLength, exif.focalLength);
      data.exif.aperture = fillEmpty(data.exif.aperture, exif.aperture);
      data.exif.shutterSpeed = fillEmpty(data.exif.shutterSpeed, exif.shutterSpeed);
      data.exif.iso = fillEmpty(data.exif.iso, exif.iso);
    } else {
      data.title = fillEmpty(data.title, humanize(slug));
    }

    fs.writeFileSync(mdxPath, serialize(data), 'utf8');
  }

  console.log(
    `[exif] 完成：新建 ${created} 个，更新 ${updated} 个；含 EXIF ${withExif} 张，无 EXIF ${noExif} 张。`
  );
  if (noExif > 0) {
    console.log('[exif] 提示：无 EXIF 的图片（如脚本生成的占位图）字段留空，可在 TinaCMS 后台手动补充。');
  }
}

main();
