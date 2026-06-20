# ONI Archive // Halo Codex

Public, static Halo lore reference site styled like an ONI terminal.

## What is included
- Static site only: `index.html`, `style.css`, `app.js`, `app-data.js`, and `assets/`
- Public-safe packaged archive data embedded in `app-data.js`
- ONI visual branding plus original diagrams and section banners
- No raw archive text directory exposed in the public package
- Internal build notes removed from the public site

## Publish on GitHub Pages
1. Create a new **public** GitHub repository.
2. Upload all files from this folder to the root of the repository.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Choose the `main` branch and `/ (root)` folder, then save.
6. Wait for GitHub Pages to publish your site.

Your site URL will usually be:

```
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY-NAME/
```

## Notes
- This site is presented as an **unofficial fan archive**.
- The public package intentionally excludes internal build notes and the raw `archive/` source folder.
- If you want a custom domain later, add a `CNAME` file and configure it in GitHub Pages settings.
