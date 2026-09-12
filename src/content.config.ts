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

export const collections = { photos };
