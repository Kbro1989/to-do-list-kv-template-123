import { type ActionFunction, type LoaderFunction } from "@remix-run/cloudflare";

export const loader: LoaderFunction = async ({ context }) => {
  const mods = await context.cloudflare.env.TO_DO_LIST.get("visual_modifications", "json");
  return Response.json(mods || []);
};

export const action: ActionFunction = async ({ request, context }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const override = await request.json() as any;
  const kv = context.cloudflare.env.TO_DO_LIST;
  
  // Store the modification in KV
  let mods: any[] = await kv.get("visual_modifications", "json") || [];
  
  // Update or append
  const existingIdx = mods.findIndex((m: any) => m.modelId === override.modelId);
  if (existingIdx >= 0) {
    mods[existingIdx] = { ...mods[existingIdx], ...override, updatedAt: Date.now() };
  } else {
    mods.push({ ...override, updatedAt: Date.now() });
  }

  await kv.put("visual_modifications", JSON.stringify(mods));

  return Response.json({ success: true, mods });
};
