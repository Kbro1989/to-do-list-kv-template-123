import { type LoaderFunction } from "@remix-run/cloudflare";

export const loader: LoaderFunction = async () => {
  return Response.json({ 
    status: "online", 
    timestamp: Date.now(),
    engine: "POG2 Sovereign Bridge",
    version: "1.0.0"
  });
};
