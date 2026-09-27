# Atlas terrain assets

## Source and rights

- Publisher: Natural Earth.
- Dataset: Gray Earth with Shaded Relief, Hypsography, and Flat Water.
- Version: 3.2.0.
- Source page: https://www.naturalearthdata.com/downloads/10m-raster-data/10m-gray-earth/
- Direct archive: https://naturalearth.s3.amazonaws.com/10m_raster/GRAY_LR_SR_W.zip
- Retrieved: 2026-07-23.
- Source archive SHA-256: `1a31009d75be2a0a941661d68485b5a82b91a7d4886f85cddea9778c9208e828`.
- Source raster: `GRAY_LR_SR_W.tif`, 16200 x 8100 pixels, grayscale, WGS84 geographic/equirectangular registration.
- Rights: Natural Earth raster and vector data are public domain under https://www.naturalearthdata.com/about/terms-of-use/.

The 25 MB source archive and 131 MB TIFF are intentionally not committed. They can be retrieved from the URL above and reproduced with `scripts/process-terrain.py`.

## Processing

The terrain is produced offline in two deterministic stages.

### Stage 1 — grayscale relief (`scripts/process-terrain.py`)

1. resamples the grayscale raster with Lanczos filtering;
2. maps flat-water values to a deep navy ocean;
3. maps land relief to a restrained grey/mineral palette;
4. exports a 4096 x 2048 desktop WebP and 2048 x 1024 mobile WebP;
5. exports a 2048 x 1024 low-contrast grayscale bump map with flat ocean.

```bash
python scripts/process-terrain.py GRAY_LR_SR_W.tif public/geo/terrain
```

### Stage 2 — stylised coloured terrain (`scripts/colourise-terrain.py`)

Reads the Stage 1 grayscale relief WebPs and maps them through a
Google-Maps-style colour ramp — soft light-blue water, pale cream land with
gentle greens in the lowlands and light tan in the highlands — with a robust
histogram stretch so the full range appears. The mapping is keyed on
shaded-relief brightness, so it is a **stylised** map-like surface, not a
survey-grade elevation model. It runs fully offline from the committed relief
WebPs (no source download needed):

```bash
python scripts/colourise-terrain.py public/geo/terrain
```

The runtime globe surface uses the Stage 2 `hypso-*.webp`; the Stage 1
`relief-*.webp` remain committed as the reproducible colour input and are also
the textureless-fallback reference. For a geographically exact hypsometric
surface, regenerate Stage 1 from a Natural Earth Cross-Blended Hypso raster
instead of Gray Earth.

## Runtime outputs

| File | Dimensions | SHA-256 | Role |
| --- | --- | --- | --- |
| `hypso-desktop.webp` | 8192 x 4096 | `6f1199155b7f322878b795be73ae825943495576f6d8c00eef9e3dfd5fc5d09b` | Coloured desktop globe surface (high-def) |
| `hypso-mobile.webp` | 2048 x 1024 | `60d0bed8b051d3daca7d934317501fc00920c191d04d014036acfa698a7ad729` | Coloured mobile globe surface |
| `relief-desktop.webp` | 8192 x 4096 | `580953f7b9467302914ad9d8103f8afa7b5972cb32f9465ef0e3c2c9a8785310` | Grayscale relief (Stage 2 input / fallback ref) |
| `relief-mobile.webp` | 2048 x 1024 | `24eb281e08ee0ff19e7aac38a936af91e411f2dcf62184442896961ac52f8a49` | Grayscale relief (Stage 2 input / fallback ref) |
| `relief-bump.webp` | 2048 x 1024 | `183306e311a70899afed30ddcf6b4140803e9842e60f79b6d8b140d205328213` | Low-contrast bump map (desktop) |

The desktop surface is 8192 x 4096 for deep-zoom sharpness. A decoded RGBA copy
is roughly 134 MB of GPU memory, so only wide viewports load it; mobile widths
use the 2048 texture and low-memory / data-saving devices fall back to the plain
globe.

Country geometry remains the separately versioned local `world-atlas` data. Terrain is presentation only and must never replace factual boundaries, locations, or selection data.

