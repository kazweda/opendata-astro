// tsc does not understand .astro files; this lets `npm run typecheck` resolve
// .astro imports. Not published (see "files" in package.json).
declare module '*.astro' {
  const Component: import('astro/runtime/server/index.js').AstroComponentFactory;
  export default Component;
}
