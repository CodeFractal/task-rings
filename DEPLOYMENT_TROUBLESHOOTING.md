# Deployment Troubleshooting

If `npm run build` fails with errors like "Cannot find module 'react'" or missing
`JSX` intrinsic elements, run `npm install` first. This installs all required
packages so the TypeScript compiler can resolve module declarations.

Running `npm install` once will also fix failures from `npm test` or `npm run lint`
that complain about missing modules.

Steps:
1. `npm install`
2. `npm run build`
3. `npm test` (optional but recommended)
4. `../publish` to deploy

Ensure you have network access to install packages. If the deploy fails, verify
you can push to the `gh-pages` branch.
