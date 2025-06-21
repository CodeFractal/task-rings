# Developing task-rings
Welcome! This guide helps new contributors get started and keep our documentation current.

## Getting Started
1. Install dependencies with `npm install`.
2. Run the development server using `npm run dev`.
3. Edit the source in `src/` and check the browser at the address printed by Vite.

## Deployment
Run `npm run deploy` to build and publish.
*Note: this does not automatically increment the version number. See the **Publish** section for more details.*

### Build
Run `npm run build` to build the app.

### Publish
1. Increment the patch version in the comment at the top of `index.html`.
2. Run `../publish` to publish the app to the live [GitHub Page](https://codefractal.github.io/task-rings).
   This is a binary that is maintained separately and lives outside of source control. Do not modify.
   It essentially just copies the `dist` folder to the `gh-pages` branch which is watched by GitHub Pages.
   You'll need to wait 40 to 60 seconds for the changes to go live. You can verify your changes are live via the incremented version number you apply in the previous step.

## Keeping Docs Up to Date
If you make changes that affect setup or deployment, please update this file and the README so future developers stay informed.
