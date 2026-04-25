// @ts-nocheck
// app/routes/avatar-lab.tsx
import { useEffect, useRef, useState } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AvatarViewport } from "~/components/AvatarViewport";
import { AvatarCompositionEngine } from "~/engines/AvatarCompositionEngine";
import { ThreejsSceneCache } from "~/rsmv/3d/threejs-cache";
import { CacheForensicsLimb } from "~/limbs/CacheForensicsLimb";

// ─── Server: Cache Pedagogy Resolution ───
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const entityId = parseInt(url.searchParams.get("entity") || "1556", 10);
  const era = url.searchParams.get("era") as "pre_avatar" | "post_avatar" | null;

  // Query local cache pedagogy for base avatar + equipment
  const forensics = CacheForensicsLimb.getInstance();
  const avatarData = await forensics.resolveAvatarEntity(entityId, {
    includeEquipment: true,
    includeIdentityKits: true,
    era: era || "post_avatar",
  });

  return json({
    entityId,
    era: era || "post_avatar",
    avatarData,
    cachePath: process.env.SOVEREIGN_CACHE_PATH || "D:\\sovereign\\cache_pedagogy",
  });
}

// ─── Client: Sovereign Viewport ───
export default function AvatarLabPage() {
  const { entityId, era, avatarData, cachePath } = useLoaderData<typeof loader>();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneCacheRef = useRef<ThreejsSceneCache | null>(null);
  
  const [composition, setComposition] = useState<any>(null);
  const [sceneCache, setSceneCache] = useState<ThreejsSceneCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initSovereignViewport() {
      try {
        setLoading(true);
        setError(null);

        // 1. Initialize ThreejsSceneCache against local cache pedagogy
        const cache = new ThreejsSceneCache({
          cacheDir: cachePath,
          revision: 221, // NXT cache revision — update via CacheForensicsLimb versioned opcode rules
          enableWASM: true,
        });

        await cache.init();
        if (!mounted) return;

        sceneCacheRef.current = cache;
        setSceneCache(cache);

        // 2. Compose avatar from cache substrate
        const engine = AvatarCompositionEngine.getInstance();
        const composed = await engine.compose({
          era,
          baseBodyId: avatarData.baseBodyId,
          gender: avatarData.gender,
          skinTone: avatarData.skinTone,
          hairStyle: avatarData.hairStyle,
          facialHair: avatarData.facialHair,
          equipment: avatarData.equipment,
          identityKits: avatarData.identityKits, // HSL color overrides
        });

        if (!mounted) return;
        setComposition(composed);

      } catch (err) {
        console.error("[AvatarLab] Sovereign viewport initialization failed:", err);
        setError(err instanceof Error ? err.message : "Unknown cache composition failure");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSovereignViewport();

    return () => {
      mounted = false;
      sceneCacheRef.current?.dispose();
    };
  }, [entityId, era, cachePath, avatarData]);

  // ─── Render ───
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="mb-6 border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-emerald-400">
          POG2 Avatar Lab
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Entity <span className="text-amber-400 font-mono">{entityId}</span> • 
          Era <span className="text-amber-400 font-mono">{era}</span> • 
          Cache <span className="text-amber-400 font-mono">{cachePath}</span>
        </p>
      </header>

      {loading && (
        <div className="flex items-center justify-center h-96 border border-slate-800 rounded-lg bg-slate-900/50">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Loading cache substrate...</p>
            <p className="text-slate-600 text-xs mt-1 font-mono">
              ThreejsSceneCache → AvatarCompositionEngine → RSModel
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 border border-red-900/50 rounded-lg bg-red-950/30 text-red-300">
          <h3 className="font-semibold mb-1">Sovereign Viewport Error</h3>
          <p className="text-sm font-mono">{error}</p>
        </div>
      )}

      {!loading && !error && composition && sceneCache && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Viewport */}
          <div className="lg:col-span-2">
            <div 
              ref={containerRef}
              className="aspect-square border border-slate-800 rounded-lg overflow-hidden bg-slate-900 relative"
            >
              <AvatarViewport
                composition={composition}
                sceneCache={sceneCache}
                autoRotate={true}
                showSkeleton={false}
                onLoad={(meta) => {
                  console.log("[AvatarLab] RSModel bridged:", {
                    bones: meta.boneCount,
                    meshes: meta.meshCount,
                    slots: meta.slotsLoaded,
                    era: meta.era,
                  });
                }}
                onError={(err) => {
                  console.error("[AvatarLab] Viewport render failure:", err);
                  setError(err.message);
                }}
              />
            </div>
          </div>

          {/* Composition Inspector */}
          <div className="space-y-4">
            <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/50">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider">
                Composition State
              </h3>
              <pre className="text-xs font-mono text-slate-300 overflow-auto max-h-96">
                {JSON.stringify(composition, null, 2)}
              </pre>
            </div>

            <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/50">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider">
                Equipment Slots
              </h3>
              <ul className="space-y-1 text-xs font-mono">
                {Object.entries(avatarData.equipment || {}).map(([slot, id]) => (
                  <li key={slot} className="flex justify-between">
                    <span className="text-slate-500">{slot}</span>
                    <span className={id ? "text-amber-400" : "text-slate-700"}>
                      {id ?? "empty"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/50">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider">
                Identity Kits (HSL)
              </h3>
              <ul className="space-y-1 text-xs font-mono">
                {Object.entries(avatarData.identityKits || {}).map(([kit, hsl]) => (
                  <li key={kit} className="flex justify-between">
                    <span className="text-slate-500">{kit}</span>
                    <span className="text-slate-300">{hsl}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Quick Test Links */}
      <footer className="mt-8 pt-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 mb-2">Quick Sovereign Tests:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 1556, label: "GhostLimb Self (1556)" },
            { id: 239, label: "KBD (239)" },
            { id: 1, label: "Player Base (1)" },
          ].map((test) => (
            <a
              key={test.id}
              href={`?entity=${test.id}&era=${era}`}
              className="px-3 py-1 text-xs border border-slate-700 rounded hover:border-emerald-500 hover:text-emerald-400 transition-colors"
            >
              {test.label}
            </a>
          ))}
          <a
            href={`?entity=${entityId}&era=${era === "post_avatar" ? "pre_avatar" : "post_avatar"}`}
            className="px-3 py-1 text-xs border border-amber-900/50 rounded text-amber-400 hover:border-amber-500 transition-colors"
          >
            Toggle Era: {era === "post_avatar" ? "→ Pre-Avatar" : "→ Post-Avatar"}
          </a>
        </div>
      </footer>
    </div>
  );
}
