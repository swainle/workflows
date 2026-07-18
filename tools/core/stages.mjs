export const STAGES = [
  { name: "design", module: "design", directory: "design" },
  { name: "dev", module: "dev", directory: "dev" },
  { name: "test", module: "test", directory: "test" },
  { name: "deployment", module: "deployment", directory: "deployment" },
];

export const STAGE_NAMES = STAGES.map(({ name }) => name);
export const STAGE_BY_NAME = Object.fromEntries(STAGES.map((stage) => [stage.name, stage]));
