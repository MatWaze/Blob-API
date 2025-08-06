import { FastifyInstance, RouteOptions } from 'fastify';
import { WebSocket, HttpRequest, TemplatedApp } from 'uWebSockets.js';

declare module 'fastify' {
  interface RouteOptions {
    handler?: (...args: any[]) => any;
    uws?: {
      topics?: string[];
      compression?: number;
      idleTimeout?: number;
    };
    uwsHandler?: (ws: WebSocket<any>, req: HttpRequest) => void;
  }

  interface FastifyInstance {
    getUws: () => TemplatedApp;
  }
}