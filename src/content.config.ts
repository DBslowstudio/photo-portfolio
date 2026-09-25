import { defineCollection } from 'astro:content';
// Astro 7 里 astro:content 的 z 已标记废弃（astro check 会报 16 条 ts(6385) 提示），
// 官方入口是 astro/zod。实测两者的校验行为一致：
// default()、optional()、嵌套 object 都正常，已用 scripts/_probe_zod.mjs 验证过。
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/**
 * 照片集合：数据源是 src/content/photos/*.mdx，由 TinaCMS 在 /admin 可视化编辑。
 * scripts/extract-exif.js 负责「只新建、不覆盖」地为 public/photos 下的图片补出 mdx，
 * 并把能从 EXIF 读到的拍摄参数填进去，读不到的留空等你在后台补。
 */
const photos = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/photos' }),
  schema: z.object({
    title: z.string(),
    image: z.string(),
    // 拍摄日期，后台可改；缺失时详情页不显示日期
    date: z.string().optional(),
    location: z.string().optional(),
    // 2.0 搜索用：自由标签（如"下雨天""街头""夜景"），后台可填
    tags: z.array(z.string()).optional(),
    description: z.string().optional(),
    exif: z
      .object({
        camera: z.string().optional(),
        lens: z.string().optional(),
        focalLength: z.string().optional(),
        aperture: z.string().optional(),
        shutterSpeed: z.string().optional(),
        iso: z.string().optional(),
      })
      .optional(),
  }),
});

/**
 * 专题集合（2.0 轨道二 · 策展区）：数据源 src/content/projects/*.md。
 * 零侵入原则：纯新增集合，photos 及 1.0 一切不受影响。
 * photos 引用碎片的 slug 列表——专题不复制文件，只组织叙事顺序；
 * 引用的 slug 在碎片区不存在时，详情页会跳过该项而不是构建失败。
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    // 专题一句话简介（中文），列表页左上、暗室序言用
    summary: z.string().optional(),
    // 英文简介（对照中文），没有时相关区块自动隐藏
    summaryEn: z.string().optional(),
    date: z.string().optional(),
    cover: z.string().optional(),
    photos: z.array(z.string()).default([]),
  }),
});

export const collections = { photos, projects };
