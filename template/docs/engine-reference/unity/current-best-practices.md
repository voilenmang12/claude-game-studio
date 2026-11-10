# Unity 6.3 LTS — Current Best Practices

**Last verified:** 2026-02-13

Modern Unity 6 patterns that may not be in the LLM's training data.
These are production-ready recommendations as of Unity 6.3 LTS.

---

## Project Setup

### Use Unity 6.3 LTS for Production
- **Supported Update releases** (6.4+): Latest features, supported only until the next one ships
- **LTS** (6.3): Production-ready, 2-year support (until Dec 2027)

### Choose the Right Render Pipeline
- **URP (Universal)**: Mobile, cross-platform, good performance ✅ Recommended for most games
- **HDRP (High Definition)**: High-end PC/console, photorealistic
- **Built-in**: Deprecated, avoid for new projects

---

## Scripting

### Use C# 9+ Features (Unity 6 Supports C# 9)

```csharp
// ✅ Record types for data
public record PlayerData(string Name, int Level, float Health);

// ✅ Init-only properties
public class Config {
    public string GameMode { get; init; }
}

// ✅ Pattern matching
var result = enemy switch {
    Boss boss => boss.Enrage(),
    Minion minion => minion.Flee(),
    _ => null
};
```

### Async/Await for Asset Loading

```csharp
// ✅ Modern async pattern
public async Task<GameObject> LoadEnemyAsync(string key) {
    var handle = Addressables.LoadAssetAsync<GameObject>(key);
    return await handle.Task;
}
```

### Use Source Generators for Serialization (Unity 6+)

```csharp
// ✅ Source-generated serialization (faster, less reflection)
[GenerateSerializer]
public partial struct PlayerStats : IComponentData {
    public int Health;
    public int Mana;
}
```

---

## DOTS/ECS (Production-Ready in Unity 6.3 LTS)

### Use ISystem (Not ComponentSystem)

```csharp
// ✅ Modern unmanaged ISystem (Burst-compatible)
public partial struct MovementSystem : ISystem {
    public void OnCreate(ref SystemState state) { }

    public void OnUpdate(ref SystemState state) {
        foreach (var (transform, speed) in
            SystemAPI.Query<RefRW<LocalTransform>, RefRO<MoveSpeed>>()) {
            transform.ValueRW.Position += speed.ValueRO.Value * SystemAPI.Time.DeltaTime;
        }
    }
}
```

### Use IJobEntity for Parallel Jobs

```csharp
// ✅ IJobEntity (replaces IJobForEach)
[BurstCompile]
public partial struct DamageJob : IJobEntity {
    public float DeltaTime;

    void Execute(ref Health health, in DamageOverTime dot) {
        health.Value -= dot.DamagePerSecond * DeltaTime;
    }
}

// Schedule it
var job = new DamageJob { DeltaTime = SystemAPI.Time.DeltaTime };
job.ScheduleParallel();
```

---

## Input

### Use Input System Package (Not Legacy Input)

```csharp
// ✅ Input Actions (rebindable, cross-platform)
using UnityEngine.InputSystem;

public class PlayerInput : MonoBehaviour {
    private PlayerControls controls;

    void Awake() {
        controls = new PlayerControls();
        controls.Gameplay.Jump.performed += ctx => Jump();
    }

    void OnEnable() => controls.Enable();
    void OnDisable() => controls.Disable();
}
```

Create Input Actions asset in editor, generate C# class via inspector.

---

## UI

### Use UI Toolkit for Runtime UI (Production-Ready in Unity 6)

```csharp
// ✅ UI Toolkit (replaces UGUI for new projects)
using UnityEngine.UIElements;

public class MainMenu : MonoBehaviour {
    void OnEnable() {
        var root = GetComponent<UIDocument>().rootVisualElement;

        var playButton = root.Q<Button>("play-button");
        playButton.clicked += StartGame;

        var scoreLabel = root.Q<Label>("score");
        scoreLabel.text = $"High Score: {PlayerPrefs.GetInt("HighScore")}";
    }
}
```

**UXML** (UI structure) + **USS** (styling) = HTML/CSS-like workflow.

---

## Asset Management

### Use Addressables (Not Resources)

```csharp
// ✅ Addressables (async, memory-efficient)
using UnityEngine.AddressableAssets;

public async Task SpawnEnemyAsync(string enemyKey) {
    var handle = Addressables.InstantiateAsync(enemyKey);
    var enemy = await handle.Task;

    // Cleanup: release when destroyed
    Addressables.ReleaseInstance(enemy);
}
```

**Benefits:** Async loading, remote content delivery, better memory control.

---

## Rendering

### Use RenderGraph API for Custom Passes (URP/HDRP)

```csharp
// ✅ RenderGraph API (Unity 6+)
public override void RecordRenderGraph(RenderGraph renderGraph, ContextContainer frameData) {
    using (var builder = renderGraph.AddRasterRenderPass<PassData>("My Pass", out var passData)) {
        // Setup pass
        builder.SetRenderFunc((PassData data, RasterGraphContext context) => {
            // Execute commands
        });
    }
}
```

**Replaces:** Old `CommandBuffer.Execute()` pattern.

**This is URP's API.** `RecordRenderGraph` overrides URP's `ScriptableRenderPass`.
HDRP custom passes are a separate API: a `CustomPass` subclass, run from a Custom
Pass Volume, overrides `Setup(ScriptableRenderContext renderContext, CommandBuffer cmd)`,
`Execute(CustomPassContext ctx)` and `Cleanup()` (HDRP 17.3, *Create a Custom
Pass in a C# script*:
https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.3/manual/Custom-Pass-Scripting.html).

---

## Performance

### Use Burst Compiler + Jobs System

```csharp
// ✅ Burst-compiled job (massive performance gain)
[BurstCompile]
struct ParticleUpdateJob : IJobParallelFor {
    public NativeArray<float3> Positions;
    public NativeArray<float3> Velocities;
    public float DeltaTime;

    public void Execute(int index) {
        Positions[index] += Velocities[index] * DeltaTime;
    }
}

// Schedule
var job = new ParticleUpdateJob {
    Positions = positions,
    Velocities = velocities,
    DeltaTime = Time.deltaTime
};
job.Schedule(positions.Length, 64).Complete();
```

**20-100x faster** than equivalent C# code.

---

### Use GPU Instancing for Repeated Objects

```csharp
// ✅ GPU Instancing (thousands of objects, minimal draw calls)
Graphics.RenderMeshInstanced(
    new RenderParams(material),
    mesh,
    0,
    matrices // NativeArray<Matrix4x4>
);
```

---

## Memory Management

### Use NativeContainers (Not Managed Arrays in Jobs)

```csharp
// ✅ NativeArray (no GC, Burst-compatible)
NativeArray<int> data = new NativeArray<int>(1000, Allocator.TempJob);
// ... use in job
data.Dispose(); // Manual cleanup required

// ✅ Or use using statement
using var data = new NativeArray<int>(1000, Allocator.TempJob);
// Auto-disposed
```

---

## Multiplayer

### Use Netcode for GameObjects (Official)

```csharp
// ✅ Unity's official netcode
using Unity.Netcode;

public class Player : NetworkBehaviour {
    private NetworkVariable<int> health = new NetworkVariable<int>(100);

    [ServerRpc]
    public void TakeDamageServerRpc(int damage) {
        health.Value -= damage;
    }
}
```

**Replaces:** UNet (deprecated), MLAPI (renamed to Netcode for GameObjects).

---

## Testing

### Use Unity Test Framework (NUnit-based)

```csharp
// ✅ Play Mode Test
[UnityTest]
public IEnumerator Player_TakesDamage_HealthDecreases() {
    var player = new GameObject().AddComponent<Player>();
    player.Health = 100;

    player.TakeDamage(25);
    yield return null; // Wait one frame

    Assert.AreEqual(75, player.Health);
}
```

---

## Command Line — Tests

Documented (Unity Manual, *Run tests from the command line*; Test Framework
command-line reference):
`<Unity editor> -runTests -batchmode -projectPath <path> -testPlatform <platform> -testResults <file>`.
`-batchmode` removes the need for user input. `-testPlatform` takes `EditMode`,
`PlayMode` (Play Mode tests in the Editor) or a player platform; with no value,
tests run in Edit Mode. `-testResults` defaults to the project root, and the
file follows NUnit's XML format: the `<test-run>` element carries
`testcasecount`, `result`, `passed` and `failed`, and each `<test-case>` a
`fullname` and a `result` of `Passed`, `Failed`, `Inconclusive` or `Skipped`.
Unity defines no common exit codes for test runs.

Observed on Unity 6000.3.23f1 — not in the docs:
- `-runTests` exits 0 when every test passes and 2 when one fails; 1 is a
  compile error (no results file is written), 3 a failed run, 4 an unknown
  `-testPlatform`. It exits by itself — no `-quit`.
- Tests outside `Assets/` are never compiled: the run reports
  `testcasecount="0"`, `result="Passed"` and exits 0 — a false pass.
- Without the `com.unity.test-framework` package, `-runTests` hangs rather
  than failing.
- `Unity` on `PATH` may be Unity's separate CLI, not the editor; it rejects
  `-batchmode` and `-version` with exit 2. Name the editor executable by its
  full path.
- `-batchmode -quit -projectPath . -logFile -` exits 1 on a compile error and
  0 when clean.

Sources:
- Run tests from the command line: https://docs.unity3d.com/6000.3/Documentation/Manual/test-framework/run-tests-from-command-line.html
- Test Framework command-line arguments: https://docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/reference-command-line.html
- NUnit test result XML format: https://docs.nunit.org/articles/nunit/technical-notes/usage/Test-Result-XML-Format.html

---

## Debugging

### Use Logging Best Practices

```csharp
// ✅ Structured logging (Unity 6+)
using UnityEngine;

Debug.Log($"Player {playerName} scored {score} points");

// ✅ Conditional compilation for debug code
#if UNITY_EDITOR || DEVELOPMENT_BUILD
    Debug.DrawRay(transform.position, direction, Color.red);
#endif
```

---

## Summary: Unity 6 Tech Stack

| Feature | Use This (2026) | Avoid This (Legacy) |
|---------|------------------|----------------------|
| **Input** | Input System package | `Input` class |
| **UI** | UI Toolkit | UGUI (Canvas) |
| **ECS** | ISystem + IJobEntity | ComponentSystem |
| **Rendering** | URP + RenderGraph | Built-in pipeline |
| **Assets** | Addressables | Resources |
| **Jobs** | Burst + IJobParallelFor | Coroutines for heavy work |
| **Multiplayer** | Netcode for GameObjects | UNet |

---

**Sources:**
- https://docs.unity3d.com/6000.0/Documentation/Manual/BestPracticeGuides.html
- https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/index.html
- https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/index.html

---

## 6.3 LTS → 6.6 (project pin 6000.6.7f1)

**Last verified:** 2026-11-05. Sources: the 6.4, 6.5 and 6.6 what's-new pages and upgrade guides listed in `breaking-changes.md`.

- **Statics and Play Mode:** assume Play Mode may start without a domain reload, and reset static state explicitly. Project Auditor's `UAL` warnings point at the fields to fix. 6.6 makes no-reload the default for new projects.
- **Identity:** store and compare `EntityId`, never an `int` id. Do not serialize ids as strings across Unity versions.
- **Diagnostics:** gate runtime checks with `UNITY_ENABLE_CHECKS`, and logs or profiling with `UNITY_INCLUDE_INSTRUMENTATION`. Choose the Managed Code Variant (Release or Checked) in Player settings instead of relying on Development Build.
- **Dictionaries:** in 6.6, a `[SerializeField] Dictionary<TKey, TValue>` serializes natively. Existing wrapper dictionaries keep working, so migrating is optional. If you migrate, copy the data before you remove the old field.
- **Importers:** a `ScriptedImporter` or `AssetPostprocessor` that reads another file, such as a sidecar `.json`, should declare it with `DependsOnSourceAsset` so that editing that file reimports the asset.
- **2D rendering:**
  - Custom 2D passes are Render Graph passes.
  - `Graphics.RenderSprite` / `RenderSpriteInstanced` (6.5) draw sprites without GameObjects, and work with 2D lights, sprite masks and the SRP Batcher.
  - 2D lights can filter by rendering layers and sorting layers (6.6).
  - `SpriteAtlasManager.CreateSpriteAtlas` builds atlases at runtime (6.4).
- **Input:** `OnMouseDown`, `OnMouseDrag` and `OnMouseUp` work with the Input System package (6.4).
- **uGUI:** 6.6 adds a built-in `SafeArea` component and Max Width/Height on `LayoutElement`. Do not combine it with another safe-area script on one canvas.
- **Web build size:**
  - 6.6 adds two Code Optimization options, "Maximum Size Reduction" and "Maximum Size Reduction with LTO", and a "Progressive Asset Loading" Web player setting that loads assets per scene. Both may help with a portal's initial-download limit. Measure the build before and after changing them.
  - WebGPU is production-ready in 6.6, but WebGL 2 remains the safe default for the widest browser support.
  - WebAssembly64 raises the memory limit to 16 GB, but Unity does not recommend it where load time matters, and Safari does not support it. Do not enable it here.
- **Build analysis:** builds write reports to `Library/BuildHistory`. Read them in the Build Analysis window or through the `BuildHistory` API.
