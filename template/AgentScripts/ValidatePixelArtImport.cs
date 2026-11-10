using System.Linq;
using UnityEditor;
using UnityEngine;

// Checks how Assets/Editor/Art/PixelArtImporter.cs imported one exported Pixelorama sheet.
//   unity --proxy-disable command run_script --file AgentScripts/ValidatePixelArtImport.cs --entry ValidatePixelArtImport.Check --args '["Assets/Art/<path>.png"]' --timeout 120
public static class ValidatePixelArtImport
{
    // Imports the sheet. PixelArtImporter slices it on the next editor tick (delayCall), so call Inspect afterwards.
    public static string Check(string pngPath)
    {
        AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
        AssetDatabase.ImportAsset(pngPath, ImportAssetOptions.ForceUpdate | ImportAssetOptions.ForceSynchronousImport);
        return Inspect(pngPath);
    }

    // Runs the importer's slicing and clip step now, without waiting for the editor tick.
    public static string Slice(string pngPath)
    {
        GameStudio.Editor.PixelArtImporter.SliceAndAnimate(pngPath);
        return Inspect(pngPath);
    }

    // Read-only: reports importer settings, sprite rects and generated clips.
    public static string Inspect(string pngPath)
    {
        var importer = AssetImporter.GetAtPath(pngPath) as TextureImporter;
        if (importer == null) return "FAIL: no TextureImporter at " + pngPath;
        var sprites = AssetDatabase.LoadAllAssetsAtPath(pngPath).OfType<Sprite>().OrderBy(s => s.rect.x).ToArray();
        var dir = System.IO.Path.GetDirectoryName(pngPath).Replace('\\', '/');
        var clips = AssetDatabase.FindAssets("t:AnimationClip", new[] { dir })
            .Select(AssetDatabase.GUIDToAssetPath).ToArray();
        var lines = new System.Collections.Generic.List<string>
        {
            $"importer: type={importer.textureType} mode={importer.spriteImportMode} ppu={importer.spritePixelsPerUnit} filter={importer.filterMode} compression={importer.textureCompression} mipmaps={importer.mipmapEnabled}",
            $"sprites: {sprites.Length} -> " + string.Join(", ", sprites.Select(s => $"{s.name} {s.rect} pivot={s.pivot}")),
        };
        foreach (var c in clips)
        {
            var clip = AssetDatabase.LoadAssetAtPath<AnimationClip>(c);
            var bindings = AnimationUtility.GetObjectReferenceCurveBindings(clip);
            int keys = bindings.Sum(b => AnimationUtility.GetObjectReferenceCurve(clip, b).Length);
            lines.Add($"clip: {c} length={clip.length:F3}s fps={clip.frameRate} loop={AnimationUtility.GetAnimationClipSettings(clip).loopTime} keys={keys}");
        }
        if (clips.Length == 0) lines.Add("clip: none");
        return string.Join("\n", lines);
    }
}
