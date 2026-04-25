import { type ActionFunction } from "@remix-run/cloudflare";
import { AIService } from "~/ai-service";

export const action: ActionFunction = async ({ request, context }) => {
  const url = new URL(request.url);
  const body = await request.json() as { prompt: string };
  
  if (!body.prompt) {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  const aiService = new AIService(context.cloudflare.env);

  if (url.pathname.endsWith("/generate")) {
    const result = await aiService.generateText(body.prompt);
    return Response.json({ response: result });
  }

  if (url.pathname.endsWith("/generate-image")) {
    const result = await aiService.generateImage(body.prompt);
    return Response.json({ image: result });
  }

  return Response.json({ error: "Not Found" }, { status: 404 });
};
