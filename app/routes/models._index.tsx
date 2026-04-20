import { json, Link, useLoaderData, Form } from "@remix-run/react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { ModelAssetManager } from "../model-asset-manager";

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const manager = new ModelAssetManager(context.cloudflare.env.MODEL_ASSETS);
  const models = await manager.listModels();
  return json({ models });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const id = formData.get("id") as string;
  const manager = new ModelAssetManager(context.cloudflare.env.MODEL_ASSETS);
  await manager.deleteModel(id);
  return json({ success: true });
};

export default function ModelList() {
  const { models } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Your Model Assets</h1>
      <Link to="/models/new">Create New Model</Link>

      {models.length === 0 ? (
        <p>No models found. Create one to get started!</p>
      ) : (
        <ul>
          {models.map((model) => (
            <li key={model.id}>
              <Link to={`/models/${model.id}`}>
                {model.name} (ID: {model.modelId})
              </Link>
              <Form method="post">
                <input type="hidden" name="id" value={model.id} />
                <button type="submit">Delete</button>
              </Form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
