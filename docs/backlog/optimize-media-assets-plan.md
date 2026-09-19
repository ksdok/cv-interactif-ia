# Plan: Optimize Media Assets (Open Graph)

## Goal
Improve bandwidth efficiency and load times, especially for social media sharing cards.

## Steps
1. **Assess Current Asset**:
   - `opengraph-image.png` is currently 431 KB, which is quite large for an OG image.

2. **Compression Option**:
   - Convert the PNG to an optimized format like a lower-quality JPEG or use an image compression tool on the existing PNG.
   - Alternatively, rename to `opengraph-image.jpg` after conversion.

3. **Dynamic Generation Option (Preferred)**:
   - Introduce `app/opengraph-image.tsx` using `next/og` (`@vercel/og`).
   - Create a React component that visually resembles the current static image but uses HTML/CSS to render dynamically. This drops the file size to almost nil and allows dynamic rendering of titles/text.

4. **Testing**:
   - Delete the old static image.
   - Use tools like opengraph.xyz or Twitter Card Validator locally/staging to verify the new OG image loads correctly and quickly.
