using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace GameStudio.Editor
{
    /// <summary>
    /// Layout audit of the uGUI on screen in Play Mode: it measures what a player sees and lists the faults a screenshot
    /// review misses. Kinds: TEXT (cut, wrapped button label, glyphs larger than the box), OFFSCREEN, ESCAPE (a piece
    /// reaching outside the framed piece it sits in), RIM (text, a button or an icon on a 9-slice frame's visible border,
    /// read from the sprite pixels), OVERLAP (text over text, text over a button it is not part of, button over button)
    /// and PANEL (two framed pieces that are not nested but cover each other). Text is measured by its glyph bounds,
    /// sprites by their opaque pixels, and what a mask hides or a dark veil covers does not count.
    ///
    /// Run it with <c>node Tools/playmode.mjs "hub=audit"</c> (or <c>audit:1280x720</c> to fix the Game view first), or
    /// <c>unity command eval 'return GameStudio.Editor.UiAudit.Run();'</c>. The game's own names (decor, tooltip
    /// component, popup root) go in <c>ProjectSettings/UiAudit.json</c>; see <see cref="Settings"/>.
    /// From template TR-CG01-002.
    /// </summary>
    public static class UiAudit
    {
        /// <summary>The game's names, read from <c>ProjectSettings/UiAudit.json</c> when it exists. Every field is optional;
        /// <c>decor</c> is added to the defaults, the other lists replace them.</summary>
        [Serializable]
        public class Settings
        {
            /// <summary>Pixels of slack before a fault counts.</summary>
            public float tolerance = 3f;
            /// <summary>Name parts of pieces meant to reach past their frame or cover the screen (shadows, halos, veils,
            /// backgrounds, a tap hand, a toast). Added to the defaults.</summary>
            public string[] decor = new string[0];
            /// <summary>Full name of a tooltip component (for example <c>MyGame.HoverTip</c>): an ellipsis on a piece
            /// under one is a note, not a fault, because the tooltip shows the full text.</summary>
            public string tooltip = "";
            /// <summary>Name prefix of popup roots: a popup covers the screen under it, so the two are not compared.</summary>
            public string popupPrefix = "Popup";
            /// <summary>Names of the dark veils behind popups; what is drawn under an opaque veil does not count.</summary>
            public string[] veils = { "Veil", "Black Panel" };
            /// <summary>Image names that sit on a frame's edge on purpose (title plate, corner close button).</summary>
            public string[] edgePieces = { "Title", "Close" };
            /// <summary>Name suffix of badges, which sit on the piece they label.</summary>
            public string badgeSuffix = "Badge";
            /// <summary>Name prefixes of images that are never a frame (progress bars, fills).</summary>
            public string[] notFrames = { "Bar", "Fill" };
        }

        static readonly string[] DefaultDecor =
            { "Shadow", "Halo", "Glow", "Pointer", "Veil", "Backdrop", "Background", "Sky", "Cloud", "Black Panel", "Blocker", "Dim" };

        const string SettingsPath = "ProjectSettings/UiAudit.json";

        static Settings cfg = new Settings();
        static string[] decor = DefaultDecor;
        static Type tooltipType;
        static float Tolerance => cfg.tolerance;

        struct Box
        {
            public Rect R;
            public Graphic G;
            public string Path;
        }

        static readonly List<string> notes = new List<string>();

        /// <summary>Visible uGUI graphics the last <see cref="Collect"/> measured.</summary>
        public static int Measured { get; private set; }

        /// <summary>Audits every active canvas. First line "OK (N graphics, no layout faults)", "N fault(s)", or
        /// "NOT ASSESSED ..." when nothing on screen could be measured; then one line per fault, then notes (things
        /// that are fine by design).</summary>
        public static string Run()
        {
            var faults = Collect();
            if (Measured == 0)
                return "NOT ASSESSED: no visible uGUI graphic on screen (UI Toolkit screens are not audited; is the screen open?)";
            var n = notes.Distinct().ToList();
            string tail = n.Count > 0 ? "\n" + n.Count + " note(s)\n" + string.Join("\n", n) : "";
            return (faults.Count == 0 ? "OK (" + Measured + " graphics, no layout faults)" : faults.Count + " fault(s)\n" + string.Join("\n", faults)) + tail;
        }

        /// <summary>Saves a Game view screenshot to dir/name.png and the audit to dir/name.txt; returns the audit.</summary>
        public static string Snap(string dir, string name)
        {
            Directory.CreateDirectory(dir);
            ScreenCapture.CaptureScreenshot(System.IO.Path.Combine(dir, name + ".png"));
            string report = Run();
            File.WriteAllText(System.IO.Path.Combine(dir, name + ".txt"), report + "\n");
            return report;
        }

        /// <summary>Sets the Game view to a fixed resolution (adding it as a custom size once), so the audit measures the
        /// reference layout. Example: UiAudit.SetGameView(1280, 720).</summary>
        public static string SetGameView(int w, int h)
        {
            var asm = typeof(UnityEditor.Editor).Assembly;
            var gvType = asm.GetType("UnityEditor.GameView");
            var sizesType = asm.GetType("UnityEditor.GameViewSizes");
            var inst = typeof(ScriptableSingleton<>).MakeGenericType(sizesType).GetProperty("instance").GetValue(null);
            var group = sizesType.GetProperty("currentGroup").GetValue(inst);
            var gt = group.GetType();
            int total = (int)gt.GetMethod("GetTotalCount").Invoke(group, null);
            int index = -1;
            for (int i = 0; i < total; i++)
            {
                var s = gt.GetMethod("GetGameViewSize").Invoke(group, new object[] { i });
                var st = s.GetType();
                if ((int)st.GetProperty("width").GetValue(s) == w && (int)st.GetProperty("height").GetValue(s) == h
                    && st.GetProperty("sizeType").GetValue(s).ToString() == "FixedResolution") { index = i; break; }
            }
            if (index < 0)
            {
                var sizeType = asm.GetType("UnityEditor.GameViewSize");
                var kind = asm.GetType("UnityEditor.GameViewSizeType");
                var size = sizeType.GetConstructor(new[] { kind, typeof(int), typeof(int), typeof(string) })
                    .Invoke(new object[] { Enum.Parse(kind, "FixedResolution"), w, h, "Audit " + w + "x" + h });
                gt.GetMethod("AddCustomSize").Invoke(group, new[] { size });
                index = total;
            }
            var gv = EditorWindow.GetWindow(gvType);
            gvType.GetProperty("selectedSizeIndex", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic)
                .SetValue(gv, index);
            return "ok Game view " + w + "x" + h;
        }

        static void LoadSettings()
        {
            cfg = new Settings();
            if (File.Exists(SettingsPath)) JsonUtility.FromJsonOverwrite(File.ReadAllText(SettingsPath), cfg);
            decor = DefaultDecor.Concat(cfg.decor ?? new string[0]).Where(d => !string.IsNullOrEmpty(d)).Distinct().ToArray();
            tooltipType = string.IsNullOrEmpty(cfg.tooltip) ? null
                : AppDomain.CurrentDomain.GetAssemblies().Select(a => a.GetType(cfg.tooltip)).FirstOrDefault(t => t != null);
            if (!string.IsNullOrEmpty(cfg.tooltip) && tooltipType == null)
                notes.Add("NOTE tooltip type " + cfg.tooltip + " (" + SettingsPath + ") not found; ellipses count as cut text");
        }

        /// <summary>The faults on screen now, one line each.</summary>
        public static List<string> Collect()
        {
            var faults = new List<string>();
            notes.Clear();
            LoadSettings();
            var screen = new Rect(0, 0, Screen.width, Screen.height);
            var boxes = new List<Box>();
            foreach (var g in Object.FindObjectsByType<Graphic>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                if (!Visible(g)) continue;
                var r = ScreenRect(g);
                var clip = ClipRect(g.rectTransform);
                if (clip.HasValue && !clip.Value.Overlaps(r)) continue; // scrolled out of view
                boxes.Add(new Box { R = r, G = g, Path = PathOf(g.transform) });
            }
            Measured = boxes.Count;

            foreach (var b in boxes)
            {
                bool isDecor = IsDecor(b.G.transform);
                var clip = ClipRect(b.G.rectTransform);
                // TEXT: cut by the overflow mode, a button label wrapped onto more lines than it has, glyphs past the box.
                if (b.G is TMP_Text t && !string.IsNullOrWhiteSpace(t.text))
                {
                    var box = RectOf(t.rectTransform);
                    if (t.isTextTruncated)
                    {
                        if (t.overflowMode == TextOverflowModes.Ellipsis && tooltipType != null && t.GetComponentInParent(tooltipType) != null)
                            notes.Add("NOTE ellipsis " + b.Path + " (full text in its tooltip)");
                        else faults.Add("TEXT cut      " + b.Path + "  \"" + Short(t.text) + "\"");
                    }
                    else if (t.transform.parent != null && t.transform.parent.GetComponent<Button>() != null && t.textInfo.lineCount > t.text.Split('\n').Length)
                        faults.Add("TEXT wrap     " + b.Path + "  label of " + t.text.Split('\n').Length + " line(s) shown on " + t.textInfo.lineCount + "  \"" + Short(t.text) + "\"");
                    else if (b.R.width > box.width + Tolerance || b.R.height > box.height + Tolerance)
                        faults.Add("TEXT overflow " + b.Path + "  text " + Size(b.R) + " in box " + Size(box) + "  \"" + Short(t.text) + "\"");
                }
                if (isDecor) continue;
                var seen = clip.HasValue ? Intersect(b.R, clip.Value) : b.R;
                if (!Inside(seen, screen)) faults.Add("OFFSCREEN     " + b.Path + "  " + Size(seen) + " at " + Pos(seen));
                var frame = FrameOf(b.G.transform);
                bool edge = b.G is Image && cfg.edgePieces.Contains(b.G.name);
                if (frame != null && !edge)
                {
                    var fr = RectOf((RectTransform)frame.transform);
                    if (!Inside(seen, fr))
                        faults.Add("ESCAPE        " + b.Path + "  " + Overhang(seen, fr) + " outside " + frame.name);
                    else if (frame.type == Image.Type.Sliced && IsContent(b.G))
                    {
                        var inner = InnerRect(frame);
                        if (inner.width > 0 && inner.height > 0 && !Inside(seen, inner))
                            faults.Add("RIM           " + b.Path + "  " + Overhang(seen, inner) + " onto the rim of " + frame.name);
                    }
                }
            }

            var veils = boxes.Where(b => cfg.veils.Contains(b.G.name) && b.G.color.a > 0.3f).Select(b => b.G.transform).ToList();
            var items = boxes.Where(b => !IsDecor(b.G.transform) && !veils.Any(v => Behind(b.G.transform, v))
                && ((b.G is TMP_Text tt && !string.IsNullOrWhiteSpace(tt.text)) || b.G.GetComponent<Button>() != null)).ToList();
            for (int i = 0; i < items.Count; i++)
                for (int j = i + 1; j < items.Count; j++)
                {
                    var a = items[i]; var c = items[j];
                    if (a.G.transform.IsChildOf(c.G.transform) || c.G.transform.IsChildOf(a.G.transform)) continue;
                    var ba = a.G.GetComponentInParent<Button>(); var bc = c.G.GetComponentInParent<Button>();
                    // Two labels drawn as one by a plain button (its own children). Texts laid out on a card are compared.
                    if (ba != null && ba == bc && a.G.transform.parent == ba.transform && c.G.transform.parent == ba.transform) continue;
                    // A text on a button with no label of its own (a grid cell, a card) is a badge on it, not a clash.
                    if (a.G is TMP_Text && c.G.GetComponent<Button>() != null && c.G.GetComponentInChildren<TMP_Text>() == null) continue;
                    if (c.G is TMP_Text && a.G.GetComponent<Button>() != null && a.G.GetComponentInChildren<TMP_Text>() == null) continue;
                    if (a.G.canvas.rootCanvas != c.G.canvas.rootCanvas) continue;
                    if (InPopup(a.G.transform) != InPopup(c.G.transform)) continue;
                    var ov = Intersect(Seen(a), Seen(c));
                    if (ov.width > Tolerance * 2 && ov.height > Tolerance * 2)
                        faults.Add("OVERLAP       " + a.Path + "  x  " + c.Path + "  " + Size(ov));
                }

            var frames = boxes.Where(b => b.G is Image fi && fi.type == Image.Type.Sliced && fi.sprite != null && !IsDecor(b.G.transform)
                && !veils.Any(v => Behind(b.G.transform, v))).ToList();
            for (int i = 0; i < frames.Count; i++)
                for (int j = i + 1; j < frames.Count; j++)
                {
                    var a = frames[i]; var c = frames[j];
                    if (a.G.transform.IsChildOf(c.G.transform) || c.G.transform.IsChildOf(a.G.transform)) continue;
                    if (a.G.canvas.rootCanvas != c.G.canvas.rootCanvas || InPopup(a.G.transform) != InPopup(c.G.transform)) continue;
                    if (cfg.edgePieces.Contains(a.G.name) || cfg.edgePieces.Contains(c.G.name)) continue;
                    if (a.G.name.EndsWith(cfg.badgeSuffix) || c.G.name.EndsWith(cfg.badgeSuffix)) continue;
                    var ov = Intersect(Seen(a), Seen(c));
                    if (ov.width > Tolerance * 2 && ov.height > Tolerance * 2)
                        faults.Add("PANEL         " + a.Path + "  x  " + c.Path + "  " + Size(ov));
                }
            return faults.Distinct().ToList();
        }

        static Rect Seen(Box b) => ClipRect(b.G.rectTransform) is Rect c ? Intersect(b.R, c) : b.R;

        /// <summary>True when <paramref name="t"/> is drawn before (under) <paramref name="veil"/> in the veil's parent.</summary>
        static bool Behind(Transform t, Transform veil)
        {
            var p = veil.parent;
            if (p == null || !t.IsChildOf(p) || t.IsChildOf(veil)) return false;
            var top = t;
            while (top.parent != p) top = top.parent;
            return top.GetSiblingIndex() < veil.GetSiblingIndex();
        }

        static bool InPopup(Transform t)
        {
            if (string.IsNullOrEmpty(cfg.popupPrefix)) return false;
            for (var p = t; p != null; p = p.parent) if (p.name.StartsWith(cfg.popupPrefix)) return true;
            return false;
        }

        static bool Visible(Graphic g)
        {
            if (!g.enabled || !g.gameObject.activeInHierarchy || g.canvas == null) return false;
            if (g.color.a < 0.02f) return false;
            float a = 1;
            for (var p = g.transform; p != null; p = p.parent)
            {
                var cg = p.GetComponent<CanvasGroup>();
                if (cg != null) { a *= cg.alpha; if (cg.ignoreParentGroups) break; }
            }
            if (a < 0.02f) return false;
            var r = g.rectTransform.rect;
            return r.width > 0.5f && r.height > 0.5f;
        }

        static bool IsDecor(Transform t)
        {
            for (var p = t; p != null; p = p.parent)
                if (decor.Any(d => p.name.Contains(d))) return true;
            return false;
        }

        /// <summary>Nearest ancestor drawn as a framed piece (an enabled Image with a sprite that is not decor).</summary>
        static Image FrameOf(Transform t)
        {
            for (var p = t.parent; p != null; p = p.parent)
            {
                if (p.GetComponent<Canvas>() != null && p.parent == null) return null;
                var im = p.GetComponent<Image>();
                if (im != null && im.enabled && im.sprite != null && !IsDecor(p) && im.color.a > 0.02f
                    && !cfg.notFrames.Any(n => p.name.StartsWith(n))) return im;
            }
            return null;
        }

        /// <summary>Text, buttons and plain icons: what must sit inside a frame's border, not on it.</summary>
        static bool IsContent(Graphic g)
        {
            if (g is TMP_Text) return true;
            if (g.GetComponent<Button>() != null) return true;
            return g is Image im && im.type == Image.Type.Simple && im.sprite != null;
        }

        static readonly Dictionary<Sprite, Vector4> rims = new Dictionary<Sprite, Vector4>();
        static readonly Dictionary<Sprite, Rect> alphaBoxes = new Dictionary<Sprite, Rect>();

        /// <summary>Reads a sprite's texture from its source file (the imported texture is often not readable).</summary>
        static Texture2D Pixels(Sprite sp)
        {
            var path = AssetDatabase.GetAssetPath(sp.texture);
            if (string.IsNullOrEmpty(path) || !File.Exists(path)) return null;
            var tex = new Texture2D(2, 2);
            return tex.LoadImage(File.ReadAllBytes(path)) ? tex : null;
        }

        /// <summary>Visible rim of a sprite in sprite pixels (left, bottom, right, top): the run from each edge, along the
        /// middle row or column, until the pixels match the sprite's center.</summary>
        static Vector4 Rim(Sprite sp)
        {
            if (rims.TryGetValue(sp, out var v)) return v;
            v = Vector4.zero;
            var tex = Pixels(sp);
            if (tex != null)
            {
                var r = sp.rect;
                int x0 = (int)r.x, y0 = (int)r.y, w = (int)r.width, h = (int)r.height;
                Color Px(int x, int y) => tex.GetPixel(x0 + x, y0 + y);
                var center = Px(w / 2, h / 2);
                bool Same(Color c) => Mathf.Abs(c.r - center.r) + Mathf.Abs(c.g - center.g) + Mathf.Abs(c.b - center.b) < 0.12f && c.a > 0.9f;
                int RunTo(Func<int, Color> at, int n)
                {
                    for (int i = 0; i < n - 2; i++) if (Same(at(i)) && Same(at(i + 1)) && Same(at(i + 2))) return i;
                    return 0;
                }
                v = new Vector4(RunTo(i => Px(i, h / 2), w / 2), RunTo(i => Px(w / 2, i), h / 2),
                    RunTo(i => Px(w - 1 - i, h / 2), w / 2), RunTo(i => Px(w / 2, h - 1 - i), h / 2));
                Object.DestroyImmediate(tex);
            }
            rims[sp] = v;
            return v;
        }

        /// <summary>The frame's rect minus its visible rim, in screen pixels.</summary>
        static Rect InnerRect(Image im)
        {
            var rt = im.rectTransform;
            var r = rt.rect;
            var bd = Rim(im.sprite) / Mathf.Max(0.0001f, im.pixelsPerUnit * im.pixelsPerUnitMultiplier);
            var local = Rect.MinMaxRect(r.xMin + bd.x, r.yMin + bd.y, r.xMax - bd.z, r.yMax - bd.w);
            var cam = Cam(im);
            var a = RectTransformUtility.WorldToScreenPoint(cam, rt.TransformPoint(local.min));
            var b = RectTransformUtility.WorldToScreenPoint(cam, rt.TransformPoint(local.max));
            return Rect.MinMaxRect(Mathf.Min(a.x, b.x), Mathf.Min(a.y, b.y), Mathf.Max(a.x, b.x), Mathf.Max(a.y, b.y));
        }

        static Rect? ClipRect(RectTransform t)
        {
            Rect? r = null;
            for (var p = t.parent; p != null; p = p.parent)
                if (p.GetComponent<RectMask2D>() != null || (p.GetComponent<Mask>() is Mask m && m.enabled))
                {
                    var mr = RectOf((RectTransform)p);
                    r = r.HasValue ? Intersect(r.Value, mr) : mr;
                }
            return r;
        }

        /// <summary>Screen rect of what the graphic draws: glyph bounds for text, opaque pixels for a plain sprite, the
        /// rect for anything else.</summary>
        static Rect ScreenRect(Graphic g)
        {
            if (g is TMP_Text t && !string.IsNullOrEmpty(t.text))
            {
                t.ForceMeshUpdate();
                var b = t.textBounds;
                if (b.size.x > 0 && b.size.y > 0)
                {
                    var cam = Cam(t);
                    var p0 = RectTransformUtility.WorldToScreenPoint(cam, t.transform.TransformPoint(b.min));
                    var p1 = RectTransformUtility.WorldToScreenPoint(cam, t.transform.TransformPoint(b.max));
                    return Rect.MinMaxRect(Mathf.Min(p0.x, p1.x), Mathf.Min(p0.y, p1.y), Mathf.Max(p0.x, p1.x), Mathf.Max(p0.y, p1.y));
                }
            }
            if (g is Image im && im.type == Image.Type.Simple && im.sprite != null)
            {
                var lr = g.rectTransform.rect;
                if (im.preserveAspect)
                {
                    float aspect = im.sprite.rect.width / im.sprite.rect.height;
                    float w = lr.width, h = lr.height;
                    if (w / h > aspect) w = h * aspect; else h = w / aspect;
                    lr = new Rect(lr.center.x - w / 2, lr.center.y - h / 2, w, h);
                }
                var box = AlphaBox(im.sprite);
                var drawn = Rect.MinMaxRect(lr.xMin + box.xMin * lr.width, lr.yMin + box.yMin * lr.height, lr.xMin + box.xMax * lr.width, lr.yMin + box.yMax * lr.height);
                return ScreenOfLocal(g, drawn);
            }
            return RectOf(g.rectTransform);
        }

        /// <summary>The sprite's opaque pixels as a 0..1 box of its rect.</summary>
        static Rect AlphaBox(Sprite sp)
        {
            if (alphaBoxes.TryGetValue(sp, out var box)) return box;
            box = new Rect(0, 0, 1, 1);
            var tex = Pixels(sp);
            if (tex != null)
            {
                var r = sp.rect;
                int x0 = int.MaxValue, y0 = int.MaxValue, x1 = -1, y1 = -1;
                for (int y = 0; y < (int)r.height; y++)
                    for (int x = 0; x < (int)r.width; x++)
                        if (tex.GetPixel((int)r.x + x, (int)r.y + y).a > 0.1f)
                        {
                            if (x < x0) x0 = x;
                            if (x > x1) x1 = x;
                            if (y < y0) y0 = y;
                            if (y > y1) y1 = y;
                        }
                if (x1 >= 0) box = Rect.MinMaxRect(x0 / r.width, y0 / r.height, (x1 + 1) / r.width, (y1 + 1) / r.height);
                Object.DestroyImmediate(tex);
            }
            alphaBoxes[sp] = box;
            return box;
        }

        static Rect ScreenOfLocal(Graphic g, Rect local)
        {
            var cam = Cam(g);
            var t = g.rectTransform;
            var pts = new[] { local.min, local.max, new Vector2(local.xMin, local.yMax), new Vector2(local.xMax, local.yMin) }
                .Select(p => RectTransformUtility.WorldToScreenPoint(cam, t.TransformPoint(p))).ToArray();
            return Rect.MinMaxRect(pts.Min(p => p.x), pts.Min(p => p.y), pts.Max(p => p.x), pts.Max(p => p.y));
        }

        static Rect RectOf(RectTransform rt)
        {
            var c = new Vector3[4];
            rt.GetWorldCorners(c);
            var cv = rt.GetComponentInParent<Canvas>();
            var cam = cv != null && cv.rootCanvas.renderMode != RenderMode.ScreenSpaceOverlay ? cv.rootCanvas.worldCamera : null;
            var a = RectTransformUtility.WorldToScreenPoint(cam, c[0]);
            var b = RectTransformUtility.WorldToScreenPoint(cam, c[2]);
            return Rect.MinMaxRect(Mathf.Min(a.x, b.x), Mathf.Min(a.y, b.y), Mathf.Max(a.x, b.x), Mathf.Max(a.y, b.y));
        }

        static Camera Cam(Graphic g)
        {
            var root = g.canvas.rootCanvas;
            return root.renderMode == RenderMode.ScreenSpaceOverlay ? null : root.worldCamera;
        }

        static bool Inside(Rect a, Rect outer) =>
            a.xMin >= outer.xMin - Tolerance && a.yMin >= outer.yMin - Tolerance && a.xMax <= outer.xMax + Tolerance && a.yMax <= outer.yMax + Tolerance;

        static Rect Intersect(Rect a, Rect b)
        {
            float x0 = Mathf.Max(a.xMin, b.xMin), y0 = Mathf.Max(a.yMin, b.yMin), x1 = Mathf.Min(a.xMax, b.xMax), y1 = Mathf.Min(a.yMax, b.yMax);
            return x1 > x0 && y1 > y0 ? Rect.MinMaxRect(x0, y0, x1, y1) : new Rect(x0, y0, 0, 0);
        }

        static string Overhang(Rect a, Rect o)
        {
            var parts = new List<string>();
            if (a.xMin < o.xMin - Tolerance) parts.Add("left " + Mathf.RoundToInt(o.xMin - a.xMin));
            if (a.xMax > o.xMax + Tolerance) parts.Add("right " + Mathf.RoundToInt(a.xMax - o.xMax));
            if (a.yMax > o.yMax + Tolerance) parts.Add("top " + Mathf.RoundToInt(a.yMax - o.yMax));
            if (a.yMin < o.yMin - Tolerance) parts.Add("bottom " + Mathf.RoundToInt(o.yMin - a.yMin));
            return string.Join(", ", parts) + " px";
        }

        static string PathOf(Transform t)
        {
            var names = new List<string>();
            for (var p = t; p != null && names.Count < 4; p = p.parent) names.Add(p.name);
            names.Reverse();
            return string.Join("/", names);
        }

        static string Size(Rect r) => Mathf.RoundToInt(r.width) + "x" + Mathf.RoundToInt(r.height);
        static string Pos(Rect r) => Mathf.RoundToInt(r.x) + "," + Mathf.RoundToInt(r.y);

        static string Short(string s)
        {
            s = System.Text.RegularExpressions.Regex.Replace(s, "<[^>]+>", "").Replace("\n", " / ");
            return s.Length > 40 ? s.Substring(0, 40) + "..." : s;
        }
    }
}
