import { json, redirect } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { Form } from "@remix-run/react";
import { ModelAssetManager } from "../model-asset-manager";

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const modelId = parseInt(formData.get("modelId") as string);
  const name = formData.get("name") as string;

  if (isNaN(modelId) || !name) {
    return json({ errors: { modelId: "Model ID is required and must be a number", name: "Name is required" } }, { status: 400 });
  }

  const manager = new ModelAssetManager(context.cloudflare.env.MODEL_ASSETS);
  const newModel = await manager.saveModel({
    id: crypto.randomUUID(),
    modelId,
    name,
    colors: {},
    createdAt: Date.now(),
  });

  return redirect(`/models/${newModel.id}`);
};

export default function NewModel() {
  return (
    <div>
      <h1>Create New Model Asset</h1>
      <Form method="post">
        <div>
          <label htmlFor="modelId">RuneScape Model ID:</label>
          <input type="number" id="modelId" name="modelId" required />
        </div>
        <div>
          <label htmlFor="name">Model Name:</label>
          <input type="text" id="name" name="name" required />
        </div>
        <button type="submit">Create Model</button>
      </Form>
    </div>
  );
}
