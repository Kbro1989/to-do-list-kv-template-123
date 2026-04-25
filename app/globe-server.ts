import { Server } from "partyserver";

export interface Position {
  lat: number;
  lng: number;
  id: string;
  system?: boolean;
}

export type OutgoingMessage =
  | { type: "add-marker"; position: Position }
  | { type: "remove-marker"; id: string }
  | { type: "state-sync"; state: { id: string; nodes: Record<string, any>; lastSync: number } }
  | { type: "update-node"; nodeId: string; data: any };

type ConnectionState = {
  position: Position;
};

export class Globe extends Server {
  private nodes: Record<string, any> = {};

  async onStart(): Promise<void> {
    this.nodes = (await this.ctx.storage.get<Record<string, any>>("nodes")) || {};
    console.log(`🧠 Globe initialized with ${Object.keys(this.nodes).length} persisted nodes.`);
  }

  onConnect(conn: any, ctx: any) {
    const latitude = ctx.request.cf?.latitude as string | undefined;
    const longitude = ctx.request.cf?.longitude as string | undefined;

    const position = (latitude && longitude) ? {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
      id: conn.id,
    } : {
      lat: 0,
      lng: 0,
      id: conn.id,
      system: true
    };

    conn.setState({ position });

    conn.send(JSON.stringify({
      type: "state-sync",
      state: {
        id: "pog2-globe-consensus",
        nodes: this.nodes,
        lastSync: Date.now()
      }
    }));

    for (const connection of this.getConnections() as any[]) {
      if (connection.state?.position) {
        conn.send(JSON.stringify({
          type: "add-marker",
          position: connection.state.position,
        }));

        if (connection.id !== conn.id) {
          connection.send(JSON.stringify({
            type: "add-marker",
            position,
          }));
        }
      }
    }
  }

  onCloseOrError(connection: any) {
    this.broadcast(JSON.stringify({
      type: "remove-marker",
      id: connection.id,
    }), [connection.id]);
  }

  async onMessage(connection: any, message: string): Promise<void> {
    try {
      const data = JSON.parse(message);

      if (data.type === "update-node") {
        this.nodes[data.nodeId] = data.data;
        await this.ctx.storage.put("nodes", this.nodes);
        this.broadcast(message, [connection.id]);
        return;
      }

      if (data.type === "direct_perception" || data.type === "entity_spawn" || data.type === "volitional_request") {
        this.broadcast(message, [connection.id]);
        return;
      }
    } catch (err) {
      console.error("Failed to parse Globe message:", err);
    }
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/health")) return new Response("OK");
    if (url.pathname.endsWith("/pulse")) {
      return Response.json({
        id: "pog2-globe-consensus",
        nodeCount: Object.keys(this.nodes).length,
        nodes: Object.keys(this.nodes),
        lastSync: Date.now()
      });
    }
    return new Response("Not Found", { status: 404 });
  }

  onClose(connection: any): void { this.onCloseOrError(connection); }
  onError(connection: any): void { this.onCloseOrError(connection); }
}
