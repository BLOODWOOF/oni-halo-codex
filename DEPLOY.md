# GitHub Pages Deployment

This package is ready for GitHub Pages.

## Quick Start
1. Create a new public repository on GitHub.
2. Upload every file in this folder to the repository root.
3. Go to **Settings → Pages**.
4. Set **Source** to **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder.
6. Save and wait for the Pages deployment to finish.

## Included public-safety changes
- Internal build notes are removed from the site index.
- The raw `archive/` directory is not included in the public package.
- The site labels itself as an unofficial fan archive.
- A `.nojekyll` file is included for GitHub Pages compatibility.

## Optional improvements
- Add a `CNAME` file for a custom domain.
- Add a `favicon.ico` if you want a browser tab icon.
- Later, you can split `app-data.js` into smaller files if you want faster loading.
