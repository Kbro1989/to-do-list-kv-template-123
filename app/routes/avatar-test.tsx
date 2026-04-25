// @ts-nocheck
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { AvatarViewport } from "../components/AvatarViewport";
import type { ComposedAvatarResult } from "../../../src/engines/AvatarCompositionEngine";
import { AvatarCompositionEngine } from "../../../src/engines/AvatarCompositionEngine";
import { ThreejsSceneCache } from "../../../src/rsmv/3d/modeltothree";

export const loader = async () => {
    // Run on the server to access the Sovereign Cache and node fs
    try {
        const engine = new AvatarCompositionEngine();
        
        // We bind the cache server-side.
        // Assuming ThreejsSceneCache can be instantiated server-side for parsing:
        const cache = new ThreejsSceneCache();
        engine.bindCache(cache);

        // We need a base avatar buffer. If the cache defaults to a base avatar for empty buffers,
        // we can pass a dummy or empty buffer, or use a known default string.
        // For testing, we'll try a dummy string or rely on the engine's fallback logic if empty.
        // E.g., An empty or basic player appearance string:
        const defaultPlayerStr = "AAAA"; // Placeholder; replace with a real captured avatar string
        const result = await engine.composeFromAvatarString(defaultPlayerStr);

        if (result.ok) {
            return json({ composition: result.value, error: null });
        } else {
            return json({ composition: null, error: result.error?.message || "Failed to compose" });
        }
    } catch (e: any) {
        return json({ composition: null, error: e.message });
    }
};

export default function AvatarTestPage() {
    const { composition, error } = useLoaderData<typeof loader>();
    const [sceneCache, setSceneCache] = useState<ThreejsSceneCache | null>(null);

    useEffect(() => {
        // Instantiate the ThreejsSceneCache on the client side so the viewport can
        // perform material resolution and rendering.
        const cache = new ThreejsSceneCache();
        setSceneCache(cache);
    }, []);

    return (
        <div style={{ padding: "40px", display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#0f172a", color: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
            <h1 style={{ color: "#38bdf8", marginBottom: "10px", fontSize: "2rem" }}>Sovereign Avatar Viewport Integration</h1>
            <p style={{ color: "#94a3b8", marginBottom: "30px", fontSize: "1.1rem" }}>Rendering cache-accurate 16-slot composed meshes with unified RSModel skeletons.</p>

            {error && (
                <div style={{ backgroundColor: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", padding: "15px", borderRadius: "8px", color: "#fca5a5", marginBottom: "30px", maxWidth: "600px", textAlign: "center" }}>
                    <strong>Composition Failed:</strong> {error}
                    <p style={{ fontSize: "0.9rem", marginTop: "10px" }}>The base avatar string may need to be updated with a valid capture from the Sovereign cache.</p>
                </div>
            )}

            <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>
                <div style={{ 
                    border: "1px solid #334155", 
                    borderRadius: "12px", 
                    overflow: "hidden", 
                    backgroundColor: "#1e293b", 
                    boxShadow: "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }}>
                    {!sceneCache ? (
                        <div style={{ width: 400, height: 600, display: "flex", justifyContent: "center", alignItems: "center", color: "#64748b" }}>
                            Booting Three.js Substrate...
                        </div>
                    ) : composition ? (
                        <AvatarViewport 
                            composition={composition as ComposedAvatarResult} 
                            sceneCache={sceneCache} 
                            width={400} 
                            height={600} 
                        />
                    ) : (
                        <div style={{ width: 400, height: 600, display: "flex", justifyContent: "center", alignItems: "center", color: "#64748b" }}>
                            Waiting for valid composition payload...
                        </div>
                    )}
                </div>
                
                {composition && (
                    <div style={{ width: "350px" }}>
                        <div style={{ padding: "20px", backgroundColor: "#1e293b", borderRadius: "12px", border: "1px solid #334155", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
                            <h3 style={{ marginTop: 0, color: "#cbd5e1", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>Composition Data</h3>
                            <div style={{ fontSize: "14px", fontFamily: "monospace", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Gender:</span> 
                                    <strong style={{ color: "#f8fafc" }}>{composition.gender === 0 ? "Male" : "Female"}</strong>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Anims Attached:</span> 
                                    <strong style={{ color: "#f8fafc" }}>{Object.keys(composition.anims).length}</strong>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>Models Array:</span> 
                                    <strong style={{ color: "#f8fafc" }}>{Array.isArray(composition.models) ? 'Valid Array' : 'Invalid'}</strong>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "rgba(56, 189, 248, 0.05)", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                            <h4 style={{ margin: "0 0 10px 0", color: "#38bdf8" }}>Neurological Trace</h4>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.5 }}>
                                The <strong>RSModel</strong> bridge actively consolidates 16 distinct sub-meshes into a unified skeleton, guaranteeing seamless rendering of post-March 2026 ungrafted assets.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
