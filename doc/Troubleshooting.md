# Troubleshooting

If `npm run build` fails with errors like "Cannot find module 'react'" or missing
`JSX` intrinsic elements, run `npm install` first. This installs all required
packages so the TypeScript compiler can resolve module declarations.

Running `npm install` once will also fix failures from `npm test` or `npm run lint`
that complain about missing modules.
