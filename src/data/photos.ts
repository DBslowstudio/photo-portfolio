export interface Photo {
  slug: string;
  title: string;
  date: string;
  location?: string;
  description: string;
  image: string;
  exif?: {
    camera?: string;
    lens?: string;
    focalLength?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: string;
  };
}

/**
 * 前两条来自《摄影画廊网站部署规格》5.8 节原文，一字未改。
 * 后四条是配套占位图补的示例数据，方便三列网格有完整排版可看。
 * 换成自己的作品时：改这里的字段，并把 public/photos/ 下的同名图片替换掉即可，
 * 文件名保持不变就不用动代码。
 */
export const photos: Photo[] = [
  {
    slug: 'sunset-at-xiangshan',
    title: '日落时分',
    date: '2026-08-15',
    location: '北京·香山',
    description: '秋天的最后一抹暖光，在香山顶峰等待了两个小时。',
    image: '/photos/sunset-at-xiangshan.jpg',
    exif: {
      camera: 'Sony A7R IV',
      lens: '24-70mm f/2.8 GM',
      focalLength: '35mm',
      aperture: 'f/8',
      shutterSpeed: '1/125s',
      iso: 'ISO 100',
    },
  },
  {
    slug: 'rainy-alley',
    title: '雨巷',
    date: '2026-07-20',
    location: '苏州·平江路',
    description: '梅雨季的江南小巷，一把红伞划破灰调。',
    image: '/photos/rainy-alley.jpg',
    exif: {
      camera: 'Sony A7R IV',
      lens: '50mm f/1.4',
      focalLength: '50mm',
      aperture: 'f/2.8',
      shutterSpeed: '1/250s',
      iso: 'ISO 400',
    },
  },
  {
    slug: 'misty-mountain',
    title: '雾锁山脊',
    date: '2026-06-08',
    location: '黄山·西海大峡谷',
    description: '清晨五点上山，云雾在脚下翻涌了整整四十分钟。',
    image: '/photos/misty-mountain.jpg',
    exif: {
      camera: 'Sony A7R IV',
      lens: '70-200mm f/2.8 GM',
      focalLength: '135mm',
      aperture: 'f/5.6',
      shutterSpeed: '1/500s',
      iso: 'ISO 200',
    },
  },
  {
    slug: 'night-city',
    title: '城市夜航',
    date: '2026-05-22',
    location: '上海·陆家嘴',
    description: '从观景台俯瞰，霓虹在雨后的空气里晕开一层。',
    image: '/photos/night-city.jpg',
    exif: {
      camera: 'Sony A7R IV',
      lens: '16-35mm f/2.8 GM',
      focalLength: '24mm',
      aperture: 'f/4',
      shutterSpeed: '2s',
      iso: 'ISO 100',
    },
  },
  {
    slug: 'desert-dune',
    title: '沙丘曲线',
    date: '2026-04-11',
    location: '中卫·腾格里沙漠',
    description: '正午的侧光把沙脊切成明暗两半，风还在改写形状。',
    image: '/photos/desert-dune.jpg',
    exif: {
      camera: 'Sony A7R IV',
      lens: '24-70mm f/2.8 GM',
      focalLength: '70mm',
      aperture: 'f/11',
      shutterSpeed: '1/800s',
      iso: 'ISO 100',
    },
  },
  {
    slug: 'forest-path',
    title: '林间小径',
    date: '2026-03-19',
    location: '杭州·九溪十八涧',
    description: '光斑穿过树冠落在石阶上，走了两公里才等到这个角度。',
    image: '/photos/forest-path.jpg',
    exif: {
      camera: 'Sony A7R IV',
      lens: '35mm f/1.4 GM',
      focalLength: '35mm',
      aperture: 'f/2',
      shutterSpeed: '1/60s',
      iso: 'ISO 800',
    },
  },
];
