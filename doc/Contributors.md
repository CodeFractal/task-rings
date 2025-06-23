# Contributors
Welcome! This guide helps new contributors get started and keep our documentation current.

## Building
Run `npm run build` to build the app.

## Testing
Run `npm test` to run unit tests.

## Troubleshooting
See [Troubleshooting.md](Troubleshooting.md) to troubleshoot your development setup.

## Persistent Storage: Google Drive
Saving is handled through Google Drive. The app loads the Google API and Identity scripts from Google's CDN (see `index.html`). During development you may be prompted to sign in when the app starts.

## Keeping Docs Up to Date
If you make changes that affect setup or deployment, please update this file and the README so future developers stay informed.

## Publishing
### If you were not given a patch version (or you're not sure)
If you were not provided a patch version, DO NOT continue with the publishing process.
If you were asked to publish but you were not given a patch version, do not publish; return and ask for a patch version so that you may publish.
### If you were given a patch version to publish with
1. Update the patch version in `index.html`: both in the leading comment and the `meta[name="build-version"]` tag.
2. Run `npm run publish` to deploy the app to the live [GitHub Page](https://codefractal.github.io/task-rings). This will take about 40 to 60 seconds for the changes to go live. You can verify your changes are live by verifying that the version number on the live page matches the one you set in the previous step.
