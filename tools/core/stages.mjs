export const STAGES = [
  { name: "issue", module: "issues", directory: "issue" },
  { name: "process", module: "process", directory: "process" },
  { name: "permission", module: "permission", directory: "permission" },
  { name: "design", module: "design", directory: "design" },
  { name: "c4", module: "c4", directory: "c4" },
  { name: "api", module: "api", directory: "api" },
  { name: "database", module: "database", directory: "database" },
  { name: "backend", module: "backend", directory: "backend" },
  {
    name: "frontend:web", module: "frontend", directory: "frontend/web",
    stageName: "Web 前端实现", platform: "web", platformName: "Web",
    reference: "reference/web.md",
  },
  {
    name: "frontend:mobile", module: "frontend", directory: "frontend/mobile",
    stageName: "移动端实现", platform: "mobile", platformName: "移动端",
    reference: "reference/mobile.md",
  },
  {
    name: "frontend:mini-program", module: "frontend", directory: "frontend/mini-program",
    stageName: "小程序实现", platform: "mini-program", platformName: "小程序",
    reference: "reference/mini-program.md",
  },
  {
    name: "frontend:desktop", module: "frontend", directory: "frontend/desktop",
    stageName: "桌面端实现", platform: "desktop", platformName: "桌面端",
    reference: "reference/desktop.md",
  },
  { name: "test", module: "test", directory: "test" },
  { name: "deployment", module: "deployment", directory: "deployment" },
];

export const STAGE_NAMES = STAGES.map(({ name }) => name);
export const STAGE_BY_NAME = Object.fromEntries(STAGES.map((stage) => [stage.name, stage]));
