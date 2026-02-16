import { createLogger } from '@nexus/shared';

const logger = createLogger('RoutingTable');

/**
 * Route entry
 */
export interface RouteEntry {
  destination: string;
  nextHop: string;
  distance: number;
  timestamp: Date;
}

/**
 * Routing Table - Manages peer discovery and routing paths
 */
export class RoutingTable {
  private routes: Map<string, RouteEntry> = new Map();
  private nodeId: string;
  private ttl: number = 300000; // 5 minutes

  constructor(nodeId: string, ttl?: number) {
    this.nodeId = nodeId;
    if (ttl) {
      this.ttl = ttl;
    }
  }

  /**
   * Add or update route
   */
  public addRoute(destination: string, nextHop: string, distance: number = 1): void {
    if (destination === this.nodeId) {
      return; // Skip self-routes
    }

    const existing = this.routes.get(destination);
    if (existing && existing.distance <= distance) {
      return; // Keep shorter routes
    }

    this.routes.set(destination, {
      destination,
      nextHop,
      distance,
      timestamp: new Date(),
    });

    logger.debug(`Route added: ${destination} via ${nextHop} (distance: ${distance})`);
  }

  /**
   * Get best route to destination
   */
  public getRoute(destination: string): RouteEntry | undefined {
    const route = this.routes.get(destination);

    if (route && this.isExpired(route)) {
      this.routes.delete(destination);
      return undefined;
    }

    return route;
  }

  /**
   * Get next hop for destination
   */
  public getNextHop(destination: string): string | undefined {
    const route = this.getRoute(destination);
    return route?.nextHop;
  }

  /**
   * Remove route
   */
  public removeRoute(destination: string): void {
    this.routes.delete(destination);
    logger.debug(`Route removed: ${destination}`);
  }

  /**
   * Get all routes
   */
  public getAllRoutes(): RouteEntry[] {
    return Array.from(this.routes.values()).filter((route) => !this.isExpired(route));
  }

  /**
   * Get direct neighbors
   */
  public getDirectNeighbors(): string[] {
    return Array.from(
      new Set(
        this.getAllRoutes()
          .filter((r) => r.distance === 1)
          .map((r) => r.nextHop)
      )
    );
  }

  /**
   * Check if route is expired
   */
  private isExpired(route: RouteEntry): boolean {
    return Date.now() - route.timestamp.getTime() > this.ttl;
  }

  /**
   * Cleanup expired routes
   */
  public cleanup(): void {
    const expired: string[] = [];

    for (const [dest, route] of this.routes) {
      if (this.isExpired(route)) {
        expired.push(dest);
      }
    }

    for (const dest of expired) {
      this.routes.delete(dest);
    }

    if (expired.length > 0) {
      logger.debug(`Cleaned up ${expired.length} expired routes`);
    }
  }

  /**
   * Get routing table stats
   */
  public getStats(): Record<string, unknown> {
    const routes = this.getAllRoutes();
    const distances = routes.map((r) => r.distance);

    return {
      totalRoutes: routes.length,
      neighbors: this.getDirectNeighbors().length,
      avgDistance: distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0,
      maxDistance: distances.length > 0 ? Math.max(...distances) : 0,
    };
  }

  /**
   * Clear all routes
   */
  public clear(): void {
    this.routes.clear();
    logger.info('Routing table cleared');
  }
}
