using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEditor.U2D.Sprites;
using UnityEngine;

namespace GameStudio.Editor
{
    // Import rules for pixel art under Assets/Art/.
    // - Every PNG: Sprite, Point filter, no compression, no mipmaps, PixelsPerUnit below.
    // - A PNG with a sibling .json exported by Pixelorama (tools/export-pixelorama.sh) that has more than one frame
    //   or any tag is a sheet: it is sliced into one sprite per frame, and one looping AnimationClip per Pixelorama
    //   tag (or one "All" clip) is written next to it, timed from the project's fps and per-frame duration.
    // - Any other PNG (one frame and no tags, or no .json) is one Single sprite, so UI art can carry a 9-slice border.
    // Only the default Pixelorama spritesheet layout (one row of frames) is supported; anything else throws.
    public sealed class PixelArtImporter : AssetPostprocessor
    {
        public const string ArtRoot = "Assets/Art/";

        // Set once per game from the art bible, then keep it for every asset.
        public const int PixelsPerUnit = 16;
        // Pivot for sliced frames: bottom-center suits characters standing on the ground.
        public static readonly Vector2 FramePivot = new Vector2(0.5f, 0f);

        private void OnPreprocessTexture()
        {
            if (!IsArt(assetPath)) return;
            var importer = (TextureImporter)assetImporter;
            importer.textureType = TextureImporterType.Sprite;
            importer.spritePixelsPerUnit = PixelsPerUnit;
            importer.filterMode = FilterMode.Point;
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.mipmapEnabled = false;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.alphaIsTransparency = true;
            importer.sRGBTexture = true;
            // A PNG that is not a sheet is one sprite. Unity 6.6 would default it to Multiple and crop it to
            // its alpha bounds, which changes icon sizes and blocks a 9-slice border.
            bool isSheet = IsSheet(assetPath);
            if (!isSheet) importer.spriteImportMode = SpriteImportMode.Single;
            var settings = new TextureImporterSettings();
            importer.ReadTextureSettings(settings);
            settings.spriteMeshType = SpriteMeshType.FullRect;
            settings.spriteGenerateFallbackPhysicsShape = false;
            importer.SetTextureSettings(settings);
            if (isSheet)
            {
                // Slice inside this import: no second reimport, and no EditorApplication.delayCall, which never
                // fires while the Editor sits in the background and is driven only by the Unity CLI.
                ReadPngSize(assetPath, out int texW, out int texH);
                ApplyFrameRects(importer, assetPath, texW, texH);
            }
        }

        private static void OnPostprocessAllAssets(string[] imported, string[] deleted, string[] moved, string[] movedFrom)
        {
            var sheets = new HashSet<string>();
            foreach (var path in imported.Concat(moved))
            {
                if (!IsArt(path)) continue;
                if (path.EndsWith(".png", StringComparison.OrdinalIgnoreCase) && IsSheet(path))
                    sheets.Add(path);
                else if (path.EndsWith(".json", StringComparison.OrdinalIgnoreCase) && File.Exists(Path.ChangeExtension(path, ".png")) && IsSheet(Path.ChangeExtension(path, ".png")))
                    sheets.Add(Path.ChangeExtension(path, ".png").Replace('\\', '/'));
            }
            foreach (var png in sheets)
            {
                // A .json changed on its own: the texture must re-slice from it before clips are written.
                if (!imported.Contains(png) && !moved.Contains(png))
                {
                    AssetDatabase.ImportAsset(png, ImportAssetOptions.ForceUpdate);
                    continue; // the reimport calls back here with the png and writes the clips then
                }
                try
                {
                    var json = JObject.Parse(File.ReadAllText(JsonPathFor(png)));
                    WriteClips(png, Path.GetFileNameWithoutExtension(png), json, (JArray)json["frames"]);
                }
                catch (Exception e) { Debug.LogError($"Pixel art clips failed for {png}: {e.Message}"); }
            }
        }

        [MenuItem("Tools/Art/Reimport Pixelorama Sheets")]
        public static string ReimportAll()
        {
            var pngs = AssetDatabase.FindAssets("t:Texture2D", new[] { ArtRoot.TrimEnd('/') })
                .Select(AssetDatabase.GUIDToAssetPath)
                .Where(p => p.EndsWith(".png", StringComparison.OrdinalIgnoreCase) && IsSheet(p))
                .ToList();
            foreach (var p in pngs) SliceAndAnimate(p);
            var message = $"Processed {pngs.Count} Pixelorama sheet(s) under {ArtRoot}.";
            Debug.Log(message);
            return message;
        }

        // Re-slices an already imported sheet and rewrites its clips (menu item and CLI use).
        public static void SliceAndAnimate(string pngPath)
        {
            var importer = AssetImporter.GetAtPath(pngPath) as TextureImporter
                ?? throw new InvalidOperationException("Not a texture: " + pngPath);
            importer.GetSourceTextureWidthAndHeight(out int texW, out int texH);
            if (ApplyFrameRects(importer, pngPath, texW, texH))
                importer.SaveAndReimport(); // OnPostprocessAllAssets writes the clips
            else
            {
                var json = JObject.Parse(File.ReadAllText(JsonPathFor(pngPath)));
                WriteClips(pngPath, Path.GetFileNameWithoutExtension(pngPath), json, (JArray)json["frames"]);
            }
        }

        // Sets one sprite rect per frame on the importer. Returns true if anything changed.
        private static bool ApplyFrameRects(TextureImporter importer, string pngPath, int texW, int texH)
        {
            var json = JObject.Parse(File.ReadAllText(JsonPathFor(pngPath)));
            int frameW = Required<int>(json, "size_x");
            int frameH = Required<int>(json, "size_y");
            var frames = json["frames"] as JArray ?? throw new InvalidDataException("JSON has no 'frames' array.");
            int frameCount = frames.Count;
            if (frameCount == 0) throw new InvalidDataException("JSON has zero frames.");

            // Default Pixelorama sheet: one row, frames left to right. --scale multiplies both sides.
            if (texH % frameH != 0 || texW != frameCount * frameW * (texH / frameH))
                throw new InvalidDataException(
                    $"Sheet is {texW}x{texH}, expected one row of {frameCount} frames of {frameW}x{frameH} (any integer scale). " +
                    "Use Pixelorama's default spritesheet layout (Columns, 1 line).");
            int scale = texH / frameH;
            int cellW = frameW * scale, cellH = frameH * scale;
            string baseName = Path.GetFileNameWithoutExtension(pngPath);

            var factory = new SpriteDataProviderFactories();
            factory.Init();
            var provider = factory.GetSpriteEditorDataProviderFromObject(importer);
            provider.InitSpriteEditorDataProvider();
            var existing = provider.GetSpriteRects().ToDictionary(r => r.name, r => r);
            // Snapshot before the loop: the loop edits the existing SpriteRect objects in place, so comparing
            // against them afterwards would always report "unchanged" (Unity 6.6 auto-slices a new Multiple
            // sheet by alpha with these same names, which then never got replaced).
            var before = existing.ToDictionary(p => p.Key, p => (p.Value.rect, p.Value.pivot, p.Value.alignment));

            var rects = new List<SpriteRect>();
            for (int i = 0; i < frameCount; i++)
            {
                var name = $"{baseName}_{i}";
                var rect = existing.TryGetValue(name, out var keep) ? keep : new SpriteRect { name = name, spriteID = GUID.Generate() };
                rect.rect = new Rect(i * cellW, 0, cellW, cellH);
                rect.alignment = SpriteAlignment.Custom;
                rect.pivot = FramePivot;
                rect.border = Vector4.zero;
                rects.Add(rect);
            }

            bool changed = importer.spriteImportMode != SpriteImportMode.Multiple
                || existing.Count != rects.Count
                || rects.Any(r => !before.TryGetValue(r.name, out var old) || old.rect != r.rect || old.pivot != r.pivot || old.alignment != r.alignment);
            if (changed)
            {
                importer.spriteImportMode = SpriteImportMode.Multiple;
                provider.SetSpriteRects(rects.ToArray());
                var names = provider.GetDataProvider<ISpriteNameFileIdDataProvider>();
                names?.SetNameFileIdPairs(rects.Select(r => new SpriteNameFileIdPair(r.name, r.spriteID)).ToList());
                provider.Apply();
            }
            return changed;
        }

        // Width and height from the PNG IHDR chunk (bytes 16-23, big-endian): works before Unity has read the file.
        private static void ReadPngSize(string pngPath, out int width, out int height)
        {
            var header = new byte[24];
            using (var stream = File.OpenRead(pngPath))
                if (stream.Read(header, 0, 24) != 24 || header[1] != 'P' || header[2] != 'N' || header[3] != 'G')
                    throw new InvalidDataException("Not a PNG file: " + pngPath);
            width = (header[16] << 24) | (header[17] << 16) | (header[18] << 8) | header[19];
            height = (header[20] << 24) | (header[21] << 16) | (header[22] << 8) | header[23];
        }

        private static void WriteClips(string pngPath, string baseName, JObject json, JArray frames)
        {
            var sprites = AssetDatabase.LoadAllAssetsAtPath(pngPath).OfType<Sprite>()
                .ToDictionary(s => s.name, s => s);
            double fps = json.Value<double?>("fps") ?? 6.0;
            if (fps <= 0) throw new InvalidDataException("fps must be positive.");

            var ranges = new List<(string name, int from, int to)>();
            if (json["tags"] is JArray tags && tags.Count > 0)
            {
                foreach (var tag in tags)
                {
                    // Pixelorama tags are 1-based and inclusive.
                    int from = tag.Value<int>("from") - 1, to = tag.Value<int>("to") - 1;
                    var tagName = tag.Value<string>("name");
                    if (string.IsNullOrWhiteSpace(tagName)) throw new InvalidDataException("A Pixelorama tag has no name.");
                    if (from < 0 || to >= frames.Count || to < from) throw new InvalidDataException($"Tag '{tagName}' range {from + 1}-{to + 1} is outside the {frames.Count} frames.");
                    ranges.Add((tagName, from, to));
                }
            }
            else if (frames.Count > 1)
            {
                ranges.Add(("All", 0, frames.Count - 1));
            }

            var folder = Path.GetDirectoryName(pngPath).Replace('\\', '/');
            foreach (var (tagName, from, to) in ranges)
            {
                var keys = new List<ObjectReferenceKeyframe>();
                double t = 0;
                for (int i = from; i <= to; i++)
                {
                    var spriteName = $"{baseName}_{i}";
                    if (!sprites.TryGetValue(spriteName, out var sprite))
                        throw new InvalidDataException($"Sprite {spriteName} missing after slicing.");
                    keys.Add(new ObjectReferenceKeyframe { time = (float)t, value = sprite });
                    t += (frames[i].Value<double?>("duration") ?? 1.0) / fps;
                }
                // Unity makes a sprite clip one sample longer than its last key, so a key is needed only
                // when the last frame lasts longer than one sample.
                double holdUntil = t - 1.0 / fps;
                var last = keys[keys.Count - 1];
                if (holdUntil > last.time + 0.0001)
                    keys.Add(new ObjectReferenceKeyframe { time = (float)holdUntil, value = last.value });

                var clipPath = $"{folder}/{baseName}_{Sanitize(tagName)}.anim";
                var clip = AssetDatabase.LoadAssetAtPath<AnimationClip>(clipPath);
                bool create = clip == null;
                if (create) clip = new AnimationClip();
                clip.frameRate = (float)fps;
                var binding = EditorCurveBinding.PPtrCurve("", typeof(SpriteRenderer), "m_Sprite");
                AnimationUtility.SetObjectReferenceCurve(clip, binding, keys.ToArray());
                var settings = AnimationUtility.GetAnimationClipSettings(clip);
                settings.loopTime = true;
                AnimationUtility.SetAnimationClipSettings(clip, settings);
                if (create) AssetDatabase.CreateAsset(clip, clipPath);
                else EditorUtility.SetDirty(clip);
            }
            AssetDatabase.SaveAssets();
        }

        private static T Required<T>(JObject json, string key)
        {
            var token = json[key] ?? throw new InvalidDataException($"JSON has no '{key}'.");
            return token.Value<T>();
        }

        private static string Sanitize(string name)
        {
            var invalid = Path.GetInvalidFileNameChars();
            return new string(name.Select(c => invalid.Contains(c) || c == ' ' ? '_' : c).ToArray());
        }

        private static bool IsArt(string path) => path.Replace('\\', '/').StartsWith(ArtRoot, StringComparison.Ordinal);
        private static string JsonPathFor(string pngPath) => Path.ChangeExtension(pngPath, ".json");

        // A Pixelorama export is a sheet when it has more than one frame or any tag. A single-frame export is static art.
        public static bool IsSheet(string pngPath)
        {
            var jsonPath = JsonPathFor(pngPath);
            if (!File.Exists(jsonPath)) return false;
            var json = JObject.Parse(File.ReadAllText(jsonPath));
            var frames = json["frames"] as JArray ?? throw new InvalidDataException("JSON has no 'frames' array: " + jsonPath);
            return frames.Count > 1 || (json["tags"] is JArray tags && tags.Count > 0);
        }
    }
}
