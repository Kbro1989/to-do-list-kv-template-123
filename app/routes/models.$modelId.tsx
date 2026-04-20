import { json, useLoaderData, useFetcher } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { ModelAssetManager } from "../model-asset-manager";

interface ModelAsset {
  id: string;
  modelId: number;
  name: string;
  colors: { [key: string]: string };
  imageUrl?: string;
  metadata?: any;
  createdAt: number;
}

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { modelId } = params;
  if (!modelId) {
    throw new Response("Model ID not provided", { status: 400 });
  }

  const manager = new ModelAssetManager(context.cloudflare.env.MODEL_ASSETS);
  const model = await manager.getModel(modelId);

  if (!model) {
    throw new Response("Model not found", { status: 404 });
  }

  return json({ model });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const modelId = formData.get("id") as string;
  const modelData = JSON.parse(formData.get("modelData") as string);

  const manager = new ModelAssetManager(context.cloudflare.env.MODEL_ASSETS);
  const updatedModel = await manager.saveModel(modelData);

  return json({ updatedModel });
};

export default function ModelViewer() {
  const { model } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const handleColorChange = (part: string, color: string) => {
    const updatedColors = { ...model.colors, [part]: color };
    const updatedModel = { ...model, colors: updatedColors };

    fetcher.submit(
      { id: model.id, modelData: JSON.stringify(updatedModel) },
      { method: "post", action: `/models/${model.id}` }
    );
  };

  return (
    <div>
      <h1>Model: {model.name}</h1>
      <p>Model ID: {model.modelId}</p>
import Model3DViewer from "../components/Model3DViewer";

// ... (rest of the file)

      {/* Placeholder for 3D viewer */}
      <div style={{ width: "500px", height: "500px", border: "1px solid black" }}>
        <Model3DViewer modelAsset={model} />
      </div>

      <h2>Colors</h2>
      {
        Object.entries(model.colors).map(([part, color]) => (
          <div key={part}>
            <label>{part}: </label>
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(part, e.target.value)}
            />
          </div>
        ))
      }

      {fetcher.state === "submitting" && <p>Saving...</p>}
      {fetcher.data && fetcher.data.updatedModel && <p>Saved!</p>}
    </div>
  );
}
