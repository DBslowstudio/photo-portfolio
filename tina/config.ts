import { defineConfig } from 'tinacms';

/**
 * TinaCMS 配置（供 /admin 可视化后台使用）
 *
 * 与《SLOW慢驶终极集成指南》3.2 节的差异，都是照抄会失败的地方：
 *
 * 1. 文件路径：指南写 `.tina/config.ts`（带前导点）。@tinacms/cli 2.x 的
 *    约定是 `tina/config.ts`（无点）——CLI 源码里明确写着
 *    "Detected legacy `.tina/` config folder"，`.tina` 是已废弃的旧路径。
 *    按指南改会改到一个 CLI 根本不读的文件上，后台配置静默失效。
 *
 * 2. 指南漏了 `build.publicFolder` / `build.outputFolder`。没有这两项，
 *    `tinacms build` 不会把后台的静态文件输出到 public/admin/，
 *    部署到 Vercel 后访问 dbslowstudio.cn/admin 就是 404。
 *    静态站点没有本地 GraphQL 服务，后台必须靠这两个配置产出静态产物。
 *
 * 3. collection 名从 "posts" 改为 "photos"，与 src/content.config.ts 里
 *    Astro 的集合名一致，避免后台叫 posts、代码叫 photos 的错位。
 *
 * 4. 补回 focalLength（焦距）字段。指南的 exif 只有 5 项，但详情页
 *    要展示 6 项参数，缺了它后台就无法编辑焦距。
 *
 * ⚠️ 生效前提（必须你本人完成，我无法代办）：
 *    在 https://app.tinacloud.com 创建项目，拿到 Client ID 和 Token，
 *    然后复制 .env.example 为 .env 填入这两个值。
 *    没有凭据时 /admin 打不开，但网站本身照常构建和部署
 *    （用 npm run build:site）。
 */

// 生产分支名，影响后台保存时生成的提交目标分支
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  'main';

// 是否本地开发：决定 token 用哪个环境变量
const isLocal = process.env.NODE_ENV === 'development';

export default defineConfig({
  branch,

  /**
   * TinaCloud 项目凭据。
   * 这两个值只能你自己去 TinaCloud 后台获取，不要提交进 Git，
   * 也不要发给任何人（包括我）。
   */
 clientId: process.env.TINA_CLIENT_ID || '',
token: process.env.TINA_TOKEN || '',
  /**
   * 【关键】后台静态产物的输出位置。
   * publicFolder 指 Astro 的静态资源根目录，outputFolder 指其下的子目录，
   * 两者合起来 = public/admin/，部署后即可用 /admin 访问。
   */
build: {
  outputFolder: "admin",
  publicFolder: "public",
},

  /**
   * 媒体文件存放位置。
   * mediaRoot 设为 'photos'，后台上传的图片会落到 public/photos/，
   * image 字段值形如 /photos/xxx.jpg，与现有 .mdx 里的写法一致，
   * 换图不用改代码。
   */
  media: {
    tina: {
      publicFolder: 'public',
      mediaRoot: 'photos',
    },
  },

  schema: {
    collections: [
      {
        name: 'photos',
        label: '照片管理',
        path: 'src/content/photos',
        format: 'mdx',
        fields: [
          {
            type: 'string',
            name: 'title',
            label: '照片标题',
            isTitle: true,
            required: true,
          },
          {
            type: 'image',
            name: 'image',
            label: '照片文件',
            required: true,
          },
          {
            type: 'string',
            name: 'date',
            label: '拍摄日期',
            description: '格式 YYYY-MM-DD，用于作品排序（新作品排在前面）',
          },
          {
            type: 'string',
            name: 'location',
            label: '拍摄地点',
          },
          {
            type: 'string',
            name: 'description',
            label: '照片简介',
            ui: { component: 'textarea' },
          },
          {
            type: 'boolean',
            name: 'showQrCode',
            label: '显示线下扫码二维码',
            required: true,
            description: '关闭后详情页不再渲染二维码',
          },
          {
            type: 'image',
            name: 'qrLogo',
            label: '二维码中心 Logo',
            description: '可选。叠加在二维码中心，建议方形透明 PNG',
          },
          {
            type: 'object',
            name: 'exif',
            label: '拍摄参数',
            description: '构建时会用图片 EXIF 自动填充空缺项，已填内容不会被覆盖',
            fields: [
              { type: 'string', name: 'camera', label: '相机' },
              { type: 'string', name: 'lens', label: '镜头' },
              { type: 'string', name: 'focalLength', label: '焦距' },
              { type: 'string', name: 'aperture', label: '光圈' },
              { type: 'string', name: 'shutterSpeed', label: '快门' },
              { type: 'string', name: 'iso', label: 'ISO' },
            ],
          },
        ],
      },
    ],
  },
});
