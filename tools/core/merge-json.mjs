function decodePointerPart(value) {
  return value.replaceAll("~1", "/").replaceAll("~0", "~");
}

function removePointer(document, pointer) {
  if (!pointer.startsWith("/")) throw new Error(`Invalid JSON Pointer: ${pointer}`);
  const parts = pointer.slice(1).split("/").map(decodePointerPart);
  let parent = document;
  for (const part of parts.slice(0, -1)) {
    if (parent?.[part] === undefined) return;
    parent = parent[part];
  }
  if (parent && typeof parent === "object") delete parent[parts.at(-1)];
}

function replaceNamedEntries(target, patch, key) {
  if (!patch[key]) return;
  target[key] ??= {};
  for (const [name, value] of Object.entries(patch[key])) target[key][name] = value;
}

export function mergeOpenApi(target, patch) {
  if (target.openapi !== patch.openapi) throw new Error(`OpenAPI version mismatch: ${target.openapi} vs ${patch.openapi}`);
  for (const pointer of patch["x-handover"]?.remove ?? []) removePointer(target, pointer);
  target.paths ??= {};
  for (const [route, pathItem] of Object.entries(patch.paths ?? {})) {
    target.paths[route] ??= {};
    for (const [key, value] of Object.entries(pathItem)) target.paths[route][key] = value;
  }
  target.components ??= {};
  for (const [section, entries] of Object.entries(patch.components ?? {})) {
    target.components[section] ??= {};
    for (const [name, value] of Object.entries(entries)) target.components[section][name] = value;
  }
  if (patch.tags) target.tags = patch.tags;
  return target;
}

export function mergeAsyncApi(target, patch) {
  if (target.asyncapi !== patch.asyncapi) throw new Error(`AsyncAPI version mismatch: ${target.asyncapi} vs ${patch.asyncapi}`);
  for (const pointer of patch["x-handover"]?.remove ?? []) removePointer(target, pointer);
  for (const key of ["channels", "operations", "components"]) replaceNamedEntries(target, patch, key);
  return target;
}

export function mergeTokenTree(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value) && !value.$type && !value.$value) {
      target[key] = mergeTokenTree(target[key] && typeof target[key] === "object" ? target[key] : {}, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}
