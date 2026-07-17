export default {
  template: "frontend.prompt.md",
  artifacts: ["frontend/{{PLATFORM}}/frontend.prompt.md", "frontend/{{PLATFORM}}/design-tokens.json", "frontend/{{PLATFORM}}/*.md"],
  globals: ["docs/architecture/product.md", "docs/architecture/process", "docs/architecture/c4.puml", "docs/contracts/openapi.json", "docs/contracts/asyncapi.json", "docs/contracts/authorization.fga", "packages/design-tokens/tokens"],
};
