# Unity 6.3 LTS — Breaking Changes

**Last verified:** 2026-02-13

This document tracks breaking API changes and behavioral differences between Unity 2022 LTS
(likely in model training) and Unity 6.3 LTS (current version). Organized by risk level.

## HIGH RISK — Will Break Existing Code

### Entities/DOTS API Complete Overhaul
**Versions:** Entities 1.0+ (Unity 6.0+)

```csharp
// ❌ OLD (pre-Unity 6, GameObjectEntity pattern)
public class HealthComponent : ComponentData {
    public float Value;
}

// ✅ NEW (Unity 6+, IComponentData)
public struct HealthComponent : IComponentData {
    public float Value;
}

// ❌ OLD: ComponentSystem
public class DamageSystem : ComponentSystem { }

// ✅ NEW: ISystem (unmanaged, Burst-compatible)
public partial struct DamageSystem : ISystem {
    public void OnCreate(ref SystemState state) { }
    public void OnUpdate(ref SystemState state) { }
}
```

**Migration:** Follow Unity's ECS migration guide. Major architectural changes required.

---

### Input System — Legacy Input Deprecated
**Versions:** Unity 6.0+

```csharp
// ❌ OLD: Input class (deprecated)
if (Input.GetKeyDown(KeyCode.Space)) { }

// ✅ NEW: Input System package
using UnityEngine.InputSystem;
if (Keyboard.current.spaceKey.wasPressedThisFrame) { }
```

**Migration:** Install Input System package, replace all `Input.*` calls with new API.

---

### URP/HDRP Renderer Feature API Changes
**Versions:** Unity 6.0+

```csharp
// ❌ OLD: ScriptableRenderPass.Execute signature
public override void Execute(ScriptableRenderContext context, ref RenderingData data)

// ✅ NEW: Uses RenderGraph API
public override void RecordRenderGraph(RenderGraph renderGraph, ContextContainer frameData)
```

**Migration:** Update custom render passes to use RenderGraph API.

---

## MEDIUM RISK — Behavioral Changes

### Addressables — Asset Loading Returns
**Versions:** Unity 6.2+

Asset loading failures now throw exceptions by default instead of returning null.
Add proper exception handling or use `TryLoad` variants.

```csharp
// ❌ OLD: Silent null on failure
var handle = Addressables.LoadAssetAsync<Sprite>("key");
var sprite = handle.Result; // null if failed

// ✅ NEW: Throws on failure, use try/catch or TryLoad
try {
    var handle = Addressables.LoadAssetAsync<Sprite>("key");
    var sprite = await handle.Task;
} catch (Exception e) {
    Debug.LogError($"Failed to load: {e}");
}
```

---

### Physics — Default Solver Iterations Changed
**Versions:** Unity 6.0+

Default solver iterations increased for better stability.
Check `Physics.defaultSolverIterations` if you rely on old behavior.

---

## LOW RISK — Deprecations (Still Functional)

### UGUI (Legacy UI)
**Status:** Deprecated but supported
**Replacement:** UI Toolkit

UGUI still works but UI Toolkit is recommended for new projects.

---

### Legacy Particle System
**Status:** Deprecated
**Replacement:** Visual Effect Graph (VFX Graph)

---

### Old Animation System
**Status:** Deprecated
**Replacement:** Animator Controller (Mecanim)

---

## Platform-Specific Breaking Changes

### WebGL
- **Unity 6.0+**: WebGPU is now the default (WebGL 2.0 fallback available)
- Update shaders for WebGPU compatibility

### Android
- **Unity 6.0+**: Minimum API level raised to 24 (Android 7.0)

### iOS
- **Unity 6.0+**: Minimum deployment target raised to iOS 13

---

## Migration Checklist

When upgrading from 2022 LTS to Unity 6.3 LTS:

- [ ] Audit all DOTS/ECS code (complete rewrite likely needed)
- [ ] Replace `Input` class with Input System package
- [ ] Update custom render passes to RenderGraph API
- [ ] Add exception handling to Addressables calls
- [ ] Test physics behavior (solver iterations changed)
- [ ] Consider migrating UGUI to UI Toolkit for new UI
- [ ] Update WebGL shaders for WebGPU
- [ ] Verify minimum platform versions (Android/iOS)

---

**Sources:**
- https://docs.unity3d.com/6000.0/Documentation/Manual/upgrade-guides.html
- https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/upgrade-guide.html

---

## 6.3 LTS → 6.6 (project pin 6000.6.7f1)

**Last verified:** 2026-11-05. This section records only what the pages below state. "Not stated" means the page says nothing about that area, not that nothing changed.

### 6.3 → 6.4
- **URP Compatibility Mode removed** for custom render passes, and the `URP_COMPATIBILITY_MODE` define is gone. Custom passes must use Render Graph.
- **`InstanceID` → `EntityId`.** `EntityId` does not fit in one `int`. Do not:
  - cast it to or from `int`
  - read its sign to tell whether an object was loaded from an asset
  - use `Object.GetHashCode` as an id
  - round-trip it through `ToString`/`int.Parse`
  - sort by it to get creation order
- **`Object.Destroy` now calls `OnDisable` on descendant components**, the same as `DestroyImmediate`. Remove any workaround that calls `OnDisable` by hand, or it runs twice.
- **Asset Database dependencies:** a dependent asset reimports only when an artifact changes. A `ScriptedImporter`/`AssetPostprocessor` that reads another file's source directly must declare that file with `AssetImportContext.DependsOnSourceAsset` or `DependsOnArtifact`.
- **`[SerializeReference]`:** the Editor warns when the assigned class or one of its ancestors lacks `[Serializable]`.
- PVRTC can no longer be chosen as a texture format. Use ASTC or ETC.
- New Animator Controllers evaluate entry transitions on start. Existing controllers keep the old behaviour.

### 6.4 → 6.5
- **Obsolete `InstanceID` APIs are now compile errors.** Replace `go.GetInstanceID()` with `go.GetEntityId()`; for other members, follow each compiler error. `EntityId` is 8 bytes (`ulong`), `ToString()` now writes 64-bit values, and a negative value no longer means "created at runtime".
- **Removed shortcut properties** on `GameObject` and `Component` (`rigidbody2D`, `collider2d`, `renderer`, `camera`, `audio`, and others) and `GameObject.AddComponent(string)`. Use `GetComponent<T>()` and `AddComponent<T>()`.
- **Physics 2D low-level API renamed:** `LowLevelPhysics2D` (`UnityEngine.LowLevelPhysics2D`) became `PhysicsCore2D` (`Unity.U2D.Physics`). The `PhysicsLowLevelSettings2D` asset became Physics Core Settings 2D. Unity migrates projects on open. Changes to the classic `Rigidbody2D`/`Collider2D` module: not stated.
- **Render Pipeline Core no longer depends on uGUI.** A project that uses uGUI must list `com.unity.ugui` itself.
- **Web:** builds use Emscripten `4.0.19-unity`. "Target WebAssembly 2023" is on by default and will become required.
- Built-In Render Pipeline and dynamic batching are deprecated. Unity Mathematics is now a built-in module.
- If a particle Shape module or terrain detail needs a CPU-readable texture and Read/Write is off, the build now fails.

### 6.5 → 6.6
- **New projects enter Play Mode without a domain reload** (Reload Scene only). Effect on existing projects: not stated. Reset static state explicitly with `[AutoStaticsCleanup]` / `[NoAutoStaticsCleanup]`; the related analyzer warnings use the prefix `UAL`.
- **`UNITY_64` and `DEVELOPMENT_BUILD` are deprecated** (warnings UAC0008 and UAC0009). They become compile errors in 6.8. See `deprecated-apis.md`.
- **Dynamic batching is now obsolete.**
- **uGUI layout:** layout groups compute their max size from their children, and Content Size Fitter "Preferred Size" now respects the `LayoutElement` Max Width and Max Height.
- **UI Toolkit:** `DefaultEventSystem.LegacyInputProcessor` was removed, so `UIToolkitInputConfiguration.SetRuntimeInputBackend` no longer compiles. Legacy UXML Factory/Traits were removed; use `[UxmlElement]` and `[UxmlAttribute]`.
- **Rendering Debugger legacy API removed** (`DebugState*`, `DebugStateAttribute`, `LegacyStyles`). Use `ISerializedDebugDisplaySettings`.
- **YAML:** the "Reduce Version Control Noise" option was removed.
- Unity no longer turns on mesh Read/Write at build time for particle Shape modules, terrain detail meshes and Mesh Colliders. If it is off, the build fails.
- Cinemachine is now a core package. Cinemachine 2 projects are upgraded automatically to Cinemachine 3, which has a different API.
- By default, sprite data that comes from source files cannot be edited in the Sprite Editor. A Project Settings option overrides this.
- Web: not stated in the upgrade guide. Physics 2D: not stated.

**Sources:**
- https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity64
- https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity64
- https://docs.unity.com/en-us/engine/6000.5/manual/whats-new/unity65
- https://docs.unity.com/en-us/engine/6000.5/manual/upgrade-guides/upgrade-guide-unity65
- https://docs.unity.com/en-us/engine/6000.6/manual/whats-new/unity66
- https://docs.unity.com/en-us/engine/6000.6/manual/upgrade-guides/upgrade-guide-unity66
