import "uWebSockets.js";

// This tells TypeScript to add our definitions to the existing 'uWebSockets.js' module
declare module "uWebSockets.js" {
  // We are augmenting the existing WebSocket interface
  export interface WebSocket {
	/**
	 * Returns a parameter from the URL, by its index.
	 * For example, for the route /users/:id, getParameter(0) will return the value of :id.
	 * @param index The zero-based index of the URL parameter.
	 */
	getParameter(index: number): string;
  }
}