# Unity 6.3 LTS — Deprecated APIs

**Last verified:** 2026-02-13

Quick lookup table for deprecated APIs and their replacements.
Format: **Don't use X** → **Use Y instead**

---

## Input

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `Input.GetKey()` | `Keyboard.current[Key.X].isPressed` | New Input System |
| `Input.GetKeyDown()` | `Keyboard.current[Key.X].wasPressedThisFrame` | New Input System |
| `Input.GetMouseButton()` | `Mouse.current.leftButton.isPressed` | New Input System |
| `Input.GetAxis()` | `InputAction` callbacks | New Input System |
| `Input.mousePosition` | `Mouse.current.position.ReadValue()` | New Input System |

**Migration:** Install `com.unity.inputsystem` package.

---

## UI

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `Canvas` (UGUI) | `UIDocument` (UI Toolkit) | UI Toolkit is now production-ready |
| `Text` component | `TextMeshPro` or UI Toolkit `Label` | Better rendering, fewer draw calls |
| `Image` component | UI Toolkit `VisualElement` with background | More flexible styling |

**Migration:** UGUI still works, but UI Toolkit is recommended for new projects.

---

## DOTS/Entities

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `ComponentSystem` | `ISystem` (unmanaged) | Entities 1.0+ complete rewrite |
| `JobComponentSystem` | `ISystem` with `IJobEntity` | Burst-compatible |
| `GameObjectEntity` | Pure ECS workflow | No GameObject conversion |
| `EntityManager.CreateEntity()` (old signature) | `EntityManager.CreateEntity(EntityArchetype)` | Explicit archetype |
| `ComponentDataFromEntity<T>` | `ComponentLookup<T>` | Entities 1.0+ rename |

**Migration:** See Entities package migration guide. Major refactor required.

---

## Rendering

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `CommandBuffer.DrawMesh()` | RenderGraph API | URP/HDRP render passes |
| `OnPreRender()` / `OnPostRender()` | `RenderPipelineManager` callbacks | SRP compatibility |
| `Camera.SetReplacementShader()` | Custom render pass | Not supported in SRP |

---

## Physics

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `Physics.RaycastAll()` | `Physics.RaycastNonAlloc()` | Avoid GC allocations |
| `Rigidbody.velocity` (direct write) | `Rigidbody.AddForce()` | Better physics stability |

---

## Asset Loading

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `Resources.Load()` | Addressables | Better memory control, async loading |
| Synchronous asset loading | `Addressables.LoadAssetAsync()` | Non-blocking |

---

## Animation

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| Legacy Animation component | Animator Controller | Mecanim system |
| `Animation.Play()` | `Animator.Play()` | State machine control |

---

## Particles

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| Legacy Particle System | Visual Effect Graph | GPU-accelerated, more performant |

---

## Scripting

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `WWW` class | `UnityWebRequest` | Modern async networking |
| `Application.LoadLevel()` | `SceneManager.LoadScene()` | Scene management |

---

## Platform-Specific

### WebGL
| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| WebGL 1.0 | WebGL 2.0 or WebGPU | Unity 6+ defaults to WebGPU |

---

## Quick Migration Patterns

### Input Example
```csharp
// ❌ Deprecated
if (Input.GetKeyDown(KeyCode.Space)) {
    Jump();
}

// ✅ New Input System
using UnityEngine.InputSystem;
if (Keyboard.current.spaceKey.wasPressedThisFrame) {
    Jump();
}
```

### Asset Loading Example
```csharp
// ❌ Deprecated
var prefab = Resources.Load<GameObject>("Enemies/Goblin");

// ✅ Addressables
var handle = Addressables.LoadAssetAsync<GameObject>("Enemies/Goblin");
await handle.Task;
var prefab = handle.Result;
```

### UI Example
```csharp
// ❌ Deprecated (UGUI)
GetComponent<Text>().text = "Score: 100";

// ✅ TextMeshPro
GetComponent<TextMeshProUGUI>().text = "Score: 100";

// ✅ UI Toolkit
rootVisualElement.Q<Label>("score-label").text = "Score: 100";
```

---

**Sources:**
- https://docs.unity3d.com/6000.0/Documentation/Manual/deprecated-features.html
- https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Migration.html

---

## 6.3 LTS → 6.6 (project pin 6000.6.7f1)

**Last verified:** 2026-11-05. Sources: the 6.4, 6.5 and 6.6 upgrade guides listed in `breaking-changes.md`.

| Don't use | Use instead | Since |
|---|---|---|
| `Object.GetInstanceID()`, `int` instance ids | `Object.GetEntityId()`, `EntityId` (8 bytes) | deprecated 6.4, error 6.5 |
| `go.rigidbody2D`, `go.collider2d`, `go.renderer`, `go.camera`, `go.audio` (and the same on `Component`) | `GetComponent<Rigidbody2D>()` etc. | removed 6.5 |
| `GameObject.AddComponent(string)` | `AddComponent<T>()` | removed 6.5 |
| `UnityEngine.LowLevelPhysics2D` / `LowLevelPhysics2D` | `Unity.U2D.Physics` / `PhysicsCore2D` | 6.5 |
| `URP_COMPATIBILITY_MODE`, URP Compatibility Mode passes | Render Graph | removed 6.4 |
| Dynamic batching | Another draw-call method. The docs name none; see "Choose a method for optimizing draw calls" | deprecated 6.5, obsolete 6.6 |
| `#if UNITY_64` | `IntPtr.Size == 8`, or bitness-independent code | deprecated 6.6 (UAC0008), error 6.8 |
| `#if DEVELOPMENT_BUILD` for checks / asserts | `#if UNITY_ENABLE_CHECKS` | deprecated 6.6 (UAC0009), error 6.8 |
| `#if DEVELOPMENT_BUILD` for profiling / diagnostic logs | `#if UNITY_INCLUDE_INSTRUMENTATION` or `[Conditional("UNITY_INCLUDE_INSTRUMENTATION")]` | same |
| `#if DEVELOPMENT_BUILD` as "is this a dev player" | `Debug.isDebugBuild` | same |
| `BuildOptions.ForceEnableAssertions` | `PlayerSettings.SetManagedCodeVariant(target, ManagedCodeVariant.Checked)` | obsolete 6.6 |
| `UIToolkitInputConfiguration.SetRuntimeInputBackend` | remove the call | removed 6.6 |
| UXML `UxmlFactory` / `UxmlTraits` | `[UxmlElement]` + `[UxmlAttribute]` | removed 6.6 |
| PVRTC textures | ASTC or ETC | 6.4 |

**Note:** UAC0009 (`DEVELOPMENT_BUILD`) becomes an error in 6.8. Vendor plugins that raise it must be updated or replaced before moving past 6.7.
