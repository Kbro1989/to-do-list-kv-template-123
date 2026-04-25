import React, { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";
import { type MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => {
  return [
    { title: "POG2 Sovereign Globe" },
    { name: "description", content: "Autonomous vision and spatial telemetry for the POG2 organism." },
  ];
};

export default function GlobePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [counter, setCounter] = useState(0);
  const [nodes, setNodes] = useState<Record<string, any>>({});
  const positions = useRef<Map<string, { location: [number, number]; size: number }>>(new Map());

  const socket = usePartySocket({
    // In production, this would be your worker URL
    // In development, Wrangler's proxy will handle it
    host: typeof window !== "undefined" ? window.location.host : "localhost:8787",
    room: "default",
    party: "globe",
    onMessage(evt) {
      const message = JSON.parse(evt.data as string);
      if (message.type === "add-marker") {
        positions.current.set(message.position.id, {
          location: [message.position.lat, message.position.lng],
          size: message.position.id === socket.id ? 0.1 : 0.05,
        });
        setCounter((c) => c + 1);
      } else if (message.type === "remove-marker") {
        positions.current.delete(message.id);
        setCounter((c) => c - 1);
      } else if (message.type === "state-sync") {
        setNodes(message.state.nodes);
        console.log("🧬 POG2 State Synchronized:", message.state.id);
      } else if (message.type === "update-node") {
        setNodes((prev) => ({
          ...prev,
          [message.nodeId]: message.data,
        }));
      }
    },
  });

  useEffect(() => {
    let phi = 0;
    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 0.8,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.1, 0.1, 0.2],
      markerColor: [0.1, 0.8, 1.0],
      glowColor: [0.1, 0.1, 0.3],
      markers: [],
      opacity: 0.9,
      onRender: (state: any) => {
        state.markers = [...positions.current.values()];
        state.phi = phi;
        phi += 0.005;
      },
    } as any);

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans">
      <h1 className="text-4xl font-bold mb-4 text-cyan-400">POG2 Sovereign Globe</h1>
      
      <div className="flex gap-8 items-start">
        <div className="bg-gray-900/50 p-6 rounded-xl border border-cyan-500/30 backdrop-blur-md w-80">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-cyan-400">🧬</span> Telemetry Substrate
          </h3>
          <div className="space-y-3">
            {Object.entries(nodes).length === 0 ? (
              <div className="text-gray-500 italic">Waiting for POG2 pulse...</div>
            ) : (
              Object.entries(nodes).map(([id, data]: [string, any]) => (
                <div key={id} className="bg-black/40 p-3 rounded border border-gray-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-mono text-cyan-300">{id}</span>
                    <span className="text-xs text-gray-400">{(data.score || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest">
                    {data.status || 'active'}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-8 text-xs text-gray-500">
             {counter} connection{counter === 1 ? "" : "s"} active
          </div>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            style={{ width: 600, height: 600, maxWidth: "100%", aspectRatio: 1 }}
          />
          <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent to-black/20"></div>
        </div>
      </div>

      <p className="mt-8 text-gray-600 text-sm italic">
        Sovereign Visual Substrate v1.1.0-globe
      </p>
    </div>
  );
}
