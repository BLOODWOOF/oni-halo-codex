# Publishing the ONI Archive Terminal

This is a static website. It does not need Node.js, Python, PHP, or a database.

## Fastest option: Netlify Drop

1. Unzip `oni-archive-terminal-public.zip`.
2. Open Netlify and log in.
3. Use Netlify's drag-and-drop deploy page.
4. Drag the unzipped `oni-archive-terminal` folder into the deploy area.
5. Netlify will give you a public `netlify.app` link.
6. Use the site settings to rename the project or connect a custom domain.

## Good long-term option: GitHub Pages

1. Create a new public GitHub repository.
2. Upload the contents of the `oni-archive-terminal` folder, not the folder itself.
3. Make sure `index.html`, `app.js`, `style.css`, `app-data.js`, `.nojekyll`, and `archive/` are at the repository root.
4. Go to repository Settings > Pages.
5. Set source to deploy from the `main` branch and root folder.
6. Visit the GitHub Pages link once deployment finishes.

## Cloudflare Pages option

1. Create a GitHub repository using the same file placement described above.
2. In Cloudflare, go to Workers & Pages.
3. Create a Pages project from the GitHub repository.
4. For a no-build static site, use the repository root as the output directory.

## Public posting note

This archive is designed as a fan-made lore database. For a public site, use your own summaries and avoid uploading full copyrighted book text, game scripts, or extracted assets.
