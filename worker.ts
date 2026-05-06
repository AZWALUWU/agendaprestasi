import server from "./dist/server/server.js";

export default {
  async fetch(request: Request, env: any, ctx: any) {
    return server.fetch(request, env, ctx);
  },
};