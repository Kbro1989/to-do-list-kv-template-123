interface ModelAsset {
  id: string;
  modelId: number; // RuneScape model ID
  name: string;
  colors: { [key: string]: string }; // Object mapping color part to hex color string
  imageUrl?: string; // Optional URL to the rendered image of the model
  metadata?: any; // Optional additional metadata
  createdAt: number;
}

export class ModelAssetManager {
  constructor(
    private kv: KVNamespace,
    private modelsKey: string = "model_assets",
  ) {}

  async listModels(): Promise<ModelAsset[]> {
    const models = await this.kv.get(this.modelsKey, "json");
    if (Array.isArray(models)) {
      models.sort((a: ModelAsset, b: ModelAsset) => b.createdAt - a.createdAt);
    }
    return (models || []) as ModelAsset[];
  }

  async saveModel(model: ModelAsset): Promise<ModelAsset> {
    const models = await this.listModels();
    const existingIndex = models.findIndex((m) => m.id === model.id);

    if (existingIndex > -1) {
      models[existingIndex] = { ...models[existingIndex], ...model };
    } else {
      models.push({ ...model, id: model.id || crypto.randomUUID(), createdAt: Date.now() });
    }

    await this.kv.put(this.modelsKey, JSON.stringify(models)); // No expiration for persistent models
    return model;
  }

  async getModel(id: string): Promise<ModelAsset | undefined> {
    const models = await this.listModels();
    return models.find((model) => model.id === id);
  }

  async deleteModel(id: string): Promise<void> {
    const models = await this.listModels();
    const newModels = models.filter((model) => model.id !== id);
    await this.kv.put(this.modelsKey, JSON.stringify(newModels));
  }
}
