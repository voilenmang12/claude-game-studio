using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using UnityEngine.UIElements;
using Object = UnityEngine.Object;

namespace GameStudio.Editor
{
    // Generic Play Mode driver for Tools/playmode.mjs: finds UI by GameObject name, path or label and acts on it.
    // Nothing here knows a game's screens; a game that needs more adds its own Editor helper and calls it with eval.
    // Every method returns one line: "ok ..." or "FAIL ..." (the script turns FAIL into a failed step).
    //
    // Targets ("Btn Play", "Hud/Btn Pause", "@Play"):
    //   name        a GameObject whose name is exactly this
    //   a/b/name    a GameObject whose hierarchy path ends with this
    //   @label      a clickable whose child text (Text, TMP_Text, any component with a string "text") is this
    // uGUI first (active objects only), then UI Toolkit Buttons in every UIDocument (by element name or text).
    //
    //   unity command eval 'return GameStudio.Editor.PlayModeDriver.Click("Btn Play");'
    //   unity command eval 'return GameStudio.Editor.PlayModeDriver.Clickables();'
    public static class PlayModeDriver
    {
        const string SavedRunInBackground = "GameStudio.PlayModeDriver.RunInBackground";
        const string SetStartScene = "GameStudio.PlayModeDriver.StartScene";

        // Call in Edit Mode right before editor_play. An unfocused Editor freezes the game at frame 1 unless
        // runInBackground is on; setting it here changes PlayerSettings in memory, so the old value is kept and
        // Restore() puts it back. startScene: "first" (first enabled build scene), "current", or a scene path.
        public static string Prepare(string startScene)
        {
            if (EditorApplication.isPlaying) return "ok already playing";
            if (!SessionState.GetBool(SavedRunInBackground + ".Set", false))
            {
                SessionState.SetBool(SavedRunInBackground, PlayerSettings.runInBackground);
                SessionState.SetBool(SavedRunInBackground + ".Set", true);
            }
            Application.runInBackground = true;

            string path = startScene == "first"
                ? EditorBuildSettings.scenes.FirstOrDefault(s => s.enabled)?.path
                : startScene == "current" || string.IsNullOrEmpty(startScene) ? null : startScene;
            if (path != null && !path.EndsWith(".unity"))
                path = AssetDatabase.FindAssets("t:Scene " + path).Select(AssetDatabase.GUIDToAssetPath)
                    .FirstOrDefault(p => System.IO.Path.GetFileNameWithoutExtension(p) == path) ?? path;
            var asset = path != null ? AssetDatabase.LoadAssetAtPath<SceneAsset>(path) : null;
            if (path != null && asset == null) return "FAIL no scene asset '" + startScene + "'";
            UnityEditor.SceneManagement.EditorSceneManager.playModeStartScene = asset;
            SessionState.SetBool(SetStartScene, asset != null);
            return "ok start scene " + (asset != null ? path : SceneManager.GetActiveScene().path + " (open scene)");
        }

        // Call after editor_stop: restores PlayerSettings.runInBackground and the Play Mode start scene.
        public static string Restore()
        {
            if (EditorApplication.isPlaying) return "FAIL still playing";
            var notes = new List<string>();
            if (SessionState.GetBool(SavedRunInBackground + ".Set", false))
            {
                PlayerSettings.runInBackground = SessionState.GetBool(SavedRunInBackground, false);
                SessionState.EraseBool(SavedRunInBackground + ".Set");
                notes.Add("runInBackground=" + PlayerSettings.runInBackground);
            }
            if (SessionState.GetBool(SetStartScene, false))
            {
                UnityEditor.SceneManagement.EditorSceneManager.playModeStartScene = null;
                SessionState.EraseBool(SetStartScene);
                notes.Add("start scene cleared");
            }
            return "ok restored" + (notes.Count > 0 ? " " + string.Join(", ", notes) : " (nothing to restore)");
        }

        // Clicks a button, toggle or any IPointerClickHandler as a pointer would (down, up, click).
        public static string Click(string target)
        {
            if (!EditorApplication.isPlaying) return "FAIL not in Play Mode";
            var hits = FindClickables(target);
            if (hits.Count > 0)
            {
                var go = hits[0];
                var sel = go.GetComponent<Selectable>();
                if (sel != null && !sel.IsInteractable()) return "FAIL " + PathOf(go.transform) + " is not interactable";
                var data = new PointerEventData(EventSystem.current) { button = PointerEventData.InputButton.Left };
                ExecuteEvents.Execute(go, data, ExecuteEvents.pointerDownHandler);
                ExecuteEvents.Execute(go, data, ExecuteEvents.pointerUpHandler);
                bool handled = ExecuteEvents.Execute(go, data, ExecuteEvents.pointerClickHandler);
                if (!handled) return "FAIL " + PathOf(go.transform) + " has no click handler";
                return "ok clicked " + PathOf(go.transform) + (hits.Count > 1 ? " (" + hits.Count + " matches, took the first)" : "");
            }

            var tk = FindToolkitButton(target);
            if (tk != null)
            {
                using (var e = NavigationSubmitEvent.GetPooled())
                {
                    e.target = tk;
                    tk.SendEvent(e);
                }
                return "ok clicked UI Toolkit button " + (string.IsNullOrEmpty(tk.name) ? tk.text : tk.name);
            }

            return "FAIL nothing clickable matches '" + target + "'. On screen: " + Clickables();
        }

        // Names of the clickables a player can see now, for picking click targets.
        public static string Clickables()
        {
            var names = AllClickables().Select(g => g.name).ToList();
            foreach (var doc in Object.FindObjectsByType<UIDocument>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
                if (doc.rootVisualElement != null)
                    names.AddRange(doc.rootVisualElement.Query<UnityEngine.UIElements.Button>().ToList()
                        .Where(b => b.resolvedStyle.display != DisplayStyle.None)
                        .Select(b => string.IsNullOrEmpty(b.name) ? "@" + b.text : b.name));
            return names.Count == 0 ? "(none)" : string.Join(", ", names.Distinct());
        }

        // Activates a GameObject (a panel or screen root), even if it starts inactive.
        public static string Show(string target) => SetActive(target, true);

        // Deactivates a GameObject.
        public static string Hide(string target) => SetActive(target, false);

        // Loads a scene by name or path (it must be in the Build Profile's scene list).
        public static string Scene(string scene)
        {
            if (!EditorApplication.isPlaying) return "FAIL not in Play Mode";
            if (!Application.CanStreamedLevelBeLoaded(scene)) return "FAIL scene '" + scene + "' is not in the build scene list";
            SceneManager.LoadScene(scene);
            return "ok loading scene " + scene;
        }

        // "yes" when an active GameObject matches the target (name or path suffix), "no" otherwise.
        public static string Exists(string target) =>
            SceneObjects(false).Any(g => Matches(g, target)) ? "yes" : "no";

        // One line on the current state: active scene, frame, time scale and how many clickables are visible.
        public static string State() =>
            "ok scene=" + SceneManager.GetActiveScene().name + " frame=" + Time.frameCount + " timeScale=" + Time.timeScale +
            " screen=" + Screen.width + "x" + Screen.height + " clickables=" + AllClickables().Count;

        // --- lookup -------------------------------------------------------------------------------------------------

        static List<GameObject> FindClickables(string target)
        {
            bool byLabel = target.StartsWith("@");
            string label = byLabel ? target.Substring(1) : null;
            return AllClickables()
                .Where(g => byLabel ? LabelOf(g) == label : Matches(g, target))
                .OrderByDescending(g => g.GetComponent<Selectable>()?.IsInteractable() ?? true)
                .ThenByDescending(SortKey)
                .ToList();
        }

        // Visible, active objects that take a click. Ordered later = drawn on top.
        static List<GameObject> AllClickables() =>
            SceneObjects(false)
                .Where(g => g.GetComponent<IPointerClickHandler>() != null)
                .Where(Visible)
                .ToList();

        static UnityEngine.UIElements.Button FindToolkitButton(string target)
        {
            bool byLabel = target.StartsWith("@");
            string key = byLabel ? target.Substring(1) : target;
            foreach (var doc in Object.FindObjectsByType<UIDocument>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                if (doc.rootVisualElement == null) continue;
                var b = doc.rootVisualElement.Query<UnityEngine.UIElements.Button>().ToList()
                    .FirstOrDefault(x => x.resolvedStyle.display != DisplayStyle.None && (byLabel ? x.text == key : x.name == key || x.text == key));
                if (b != null) return b;
            }
            return null;
        }

        static string SetActive(string target, bool on)
        {
            if (!EditorApplication.isPlaying) return "FAIL not in Play Mode";
            var go = SceneObjects(true).FirstOrDefault(g => Matches(g, target));
            if (go == null) return "FAIL no GameObject matches '" + target + "'";
            go.SetActive(on);
            return "ok " + (on ? "shown " : "hidden ") + PathOf(go.transform) + (on && !go.activeInHierarchy ? " (a parent is still inactive)" : "");
        }

        // Every GameObject in loaded scenes (and DontDestroyOnLoad), optionally the inactive ones too.
        static IEnumerable<GameObject> SceneObjects(bool includeInactive) =>
            Resources.FindObjectsOfTypeAll<GameObject>()
                .Where(g => g.scene.IsValid() && g.hideFlags == HideFlags.None && (includeInactive || g.activeInHierarchy));

        static bool Matches(GameObject g, string target)
        {
            if (g.name == target) return true;
            return target.Contains("/") && ("/" + PathOf(g.transform)).EndsWith("/" + target.TrimStart('/'), StringComparison.Ordinal);
        }

        static bool Visible(GameObject g)
        {
            foreach (var group in g.GetComponentsInParent<CanvasGroup>())
            {
                if (group.alpha <= 0.01f || !group.interactable || !group.blocksRaycasts) return false;
                if (group.ignoreParentGroups) break;
            }
            var graphic = g.GetComponent<Graphic>();
            return graphic == null || graphic.enabled;
        }

        static string LabelOf(GameObject g)
        {
            foreach (var c in g.GetComponentsInChildren<Component>())
            {
                if (c == null || c is Transform) continue;
                var p = c.GetType().GetProperty("text", typeof(string));
                if (p == null || !c.GetType().Name.Contains("Text")) continue;
                var s = (p.GetValue(c) as string)?.Trim();
                if (!string.IsNullOrEmpty(s)) return StripTags(s);
            }
            return null;
        }

        static string StripTags(string s) => System.Text.RegularExpressions.Regex.Replace(s, "<[^>]+>", "");

        // Canvas sorting order first, then hierarchy order: the larger key is drawn on top.
        static string SortKey(GameObject g)
        {
            var canvas = g.GetComponentInParent<Canvas>();
            int order = canvas != null ? canvas.rootCanvas.sortingOrder : 0;
            var idx = new List<string>();
            for (var t = g.transform; t != null; t = t.parent) idx.Add(t.GetSiblingIndex().ToString("D5"));
            idx.Reverse();
            return (order + 100000).ToString("D6") + "/" + string.Join("/", idx);
        }

        static string PathOf(Transform t)
        {
            var parts = new List<string>();
            for (; t != null; t = t.parent) parts.Add(t.name);
            parts.Reverse();
            return string.Join("/", parts);
        }
    }
}
