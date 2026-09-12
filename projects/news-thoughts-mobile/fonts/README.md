# Reading webfonts

This directory contains self-hosted Open Font License fonts for this reading page.

| Files | Original family and version | Use |
| --- | --- | --- |
| `reading-serif-roman.woff2`, `reading-serif-italic.woff2` | Adobe Source Serif 4, 4.005 | Latin headings, text and real italics; weight 200–900 and optical size 8–60 preserved |
| `reading-song-sc.woff2` | Adobe Source Han Serif CN, 2.003 | Chinese text, labels and headings; weight 250–900 preserved |
| `dm-mono-light.woff2`, `dm-mono-regular.woff2`, `dm-mono-medium.woff2` | DM Mono | User-selected family B; Light 300 for navigation and metadata, Regular 400 and Medium 500 where needed |
| `ibm-plex-mono-regular.woff2`, `ibm-plex-mono-semibold.woff2` | IBM Plex Mono | Previous reading typeface assets, retained but no longer requested by this page |

The Adobe web conversions are renamed **Yi Reading Serif** and **Yi Reading Song**
in font metadata to respect the reserved font name “Source”. Original copyrights
and license records are retained. The outline designs are unchanged.

The Chinese font contains all Chinese characters in this page's HTML text,
metadata, accessible labels, image descriptions and `i18n.js` language controls,
plus available CJK/fullwidth punctuation.
`chinese-codepoints.txt` records its complete coverage. When Chinese content is
updated, regenerate this subset from the official CN variable font and check all
new characters; do not silently rely on a system-font fallback for missing text.
The Latin fonts preserve their original full character sets.

`manifest.json` records exact upstream URLs, source SHA-256 hashes, and the sizes
and SHA-256 hashes of all published WOFF2 files. The adjacent `*-OFL.txt`
files are the unmodified upstream licenses and must remain with the fonts.

Sources:

- https://github.com/adobe-fonts/source-serif
- https://github.com/adobe-fonts/source-han-serif
- https://github.com/IBM/plex
- https://github.com/google/fonts/tree/main/ofl/dmmono

The DM Mono TTFs are converted to WOFF2 with their full character set, copyright
and family names retained. `DMMono-OFL.txt` is their unchanged upstream license.
The independent comparison in `../font-reference/` includes all three candidates
and records its own font sources and licenses.
