using System;
using UnityEditor;
using UnityEngine;

namespace GameStudio.Editor
{
    // Import rules for non-pixel (raster) art under Assets/ArtRaster/: illustration, painted backgrounds,
    // smooth icons and smooth 9-slice frames from Asset Studio's raster pipeline.
    // - Every PNG: Sprite (Single), bilinear filter, compressed, no mipmaps, PixelsPerUnit below.
    // Pixel art stays under Assets/Art/ and is handled by PixelArtImporter.
    public sealed class RasterArtImporter : AssetPostprocessor
    {
        public const string ArtRoot = "Assets/ArtRaster/";

        // Matches the UI canvas reference PPU, so at Pixels Per Unit Multiplier 1 one source pixel is one canvas unit.
        public const int PixelsPerUnit = 100;
        // Asset Studio raster output is at most 2048 per axis.
        public const int MaxTextureSize = 2048;

        private void OnPreprocessTexture()
        {
            if (!IsRasterArt(assetPath)) return;
            var importer = (TextureImporter)assetImporter;
            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Single;
            importer.spritePixelsPerUnit = PixelsPerUnit;
            importer.filterMode = FilterMode.Bilinear;
            importer.mipmapEnabled = false;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.alphaIsTransparency = true;
            importer.sRGBTexture = true;
            importer.maxTextureSize = MaxTextureSize;
            // Download size matters on web and mobile, so raster art is compressed.
            importer.textureCompression = TextureImporterCompression.CompressedHQ;
            var settings = new TextureImporterSettings();
            importer.ReadTextureSettings(settings);
            // FullRect keeps 9-slice and Tiled images valid; a tight mesh would crop them.
            settings.spriteMeshType = SpriteMeshType.FullRect;
            settings.spriteGenerateFallbackPhysicsShape = false;
            importer.SetTextureSettings(settings);
        }

        public static bool IsRasterArt(string path) =>
            path.Replace('\\', '/').StartsWith(ArtRoot, StringComparison.Ordinal);
    }
}
