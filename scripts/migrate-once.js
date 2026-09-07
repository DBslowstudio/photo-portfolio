/**
 * 一次性迁移：把 src/data/photos.ts 里已有的完整数据转成 TinaCMS 用的 .mdx
 *
 * 为什么需要这个脚本：extract-exif.js 对无 EXIF 的占位图只能生成空字段，
 * 而上次任务已经写好了中文标题/日期/地点/简介/EXIF，直接跑 EXIF 脚本会丢失这些内容。
 * 所以先迁移保留，之后新增照片才交给 extract-exif.js。
 *
 * 跑完即可删除本文件，它不属于项目运行时代码。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(__dirname, '..', 'src', 'content', 'photos');
fs.mkdirSync(contentDir, { recursive: true });

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const photos = [
  {
    slug: 'sunset-at-xiangshan',
    title: '日落时分',
    date: '2026-08-15',
    location: '北京·香山',
    description: '秋天的最后一抹暖光，在香山顶峰等待了两个小时。',
    exif: { camera: 'Sony A7R IV', lens: '24-70mm f/2.8 GM', focalLength: '35mm', aperture: 'f/8', shutterSpeed: '1/125s', iso: 'ISO 100' },
  },
  {
    slug: 'rainy-alley',
    title: '雨巷',
    date: '2026-07-20',
    location: '苏州·平江路',
    description: '梅雨季的江南小巷，一把红伞划破灰调。',
    exif: { camera: 'Sony A7R IV', lens: '50mm f/1.4', focalLength: '50mm', aperture: 'f/2.8', shutterSpeed: '1/250s', iso: 'ISO 400' },
  },
  {
    slug: 'misty-mountain',
    title: '雾锁山脊',
    date: '2026-06-08',
    location: '黄山·西海大峡谷',
    description: '清晨五点上山，云雾在脚下翻涌了整整四十分钟。',
    exif: { camera: 'Sony A7R IV', lens: '70-200mm f/2.8 GM', focalLength: '135mm', aperture: 'f/5.6', shutterSpeed: '1/500s', iso: 'ISO 200' },
  },
  {
    slug: 'night-city',
    title: '城市夜航',
    date: '2026-05-22',
    location: '上海·陆家嘴',
    description: '从观景台俯瞰，霓虹在雨后的空气里晕开一层。',
    exif: { camera: 'Sony A7R IV', lens: '16-35mm f/2.8 GM', focalLength: '24mm', aperture: 'f/4', shutterSpeed: '2s', iso: 'ISO 100' },
  },
  {
    slug: 'desert-dune',
    title: '沙丘曲线',
    date: '2026-04-11',
    location: '中卫·腾格里沙漠',
    description: '正午的侧光把沙脊切成明暗两半，风还在改写形状。',
    exif: { camera: 'Sony A7R IV', lens: '24-70mm f/2.8 GM', focalLength: '70mm', aperture: 'f/11', shutterSpeed: '1/800s', iso: 'ISO 100' },
  },
  {
    slug: 'forest-path',
    title: '林间小径',
    date: '2026-03-19',
    location: '杭州·九溪十八涧',
    description: '光斑穿过树冠落在石阶上，走了两公里才等到这个角度。',
    exif: { camera: 'Sony A7R IV', lens: '35mm f/1.4 GM', focalLength: '35mm', aperture: 'f/2', shutterSpeed: '1/60s', iso: 'ISO 800' },
  },
];

for (const p of photos) {
  const mdx = `---
title: "${esc(p.title)}"
image: "/photos/${p.slug}.jpg"
date: "${esc(p.date)}"
location: "${esc(p.location)}"
description: "${esc(p.description)}"
showQrCode: true
qrLogo: ""
exif:
  camera: "${esc(p.exif.camera)}"
  lens: "${esc(p.exif.lens)}"
  focalLength: "${esc(p.exif.focalLength)}"
  aperture: "${esc(p.exif.aperture)}"
  shutterSpeed: "${esc(p.exif.shutterSpeed)}"
  iso: "${esc(p.exif.iso)}"
---
`;
  const out = path.join(contentDir, `${p.slug}.mdx`);
  fs.writeFileSync(out, mdx, 'utf8');
  console.log('迁移完成 ->', p.slug + '.mdx');
}
console.log(`共 ${photos.length} 个文件`);
