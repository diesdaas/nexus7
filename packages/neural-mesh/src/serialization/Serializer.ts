import { createLogger } from '@nexus/shared';

const logger = createLogger('Serializer');

/**
 * Serialization interface for different formats
 */
export interface ISerializer {
  serialize(data: unknown): Buffer;
  deserialize(buffer: Buffer): unknown;
  getFormat(): string;
}

/**
 * JSON Serializer - Simple JSON serialization
 */
export class JSONSerializer implements ISerializer {
  public serialize(data: unknown): Buffer {
    try {
      const json = JSON.stringify(data);
      return Buffer.from(json, 'utf-8');
    } catch (error) {
      logger.error('JSON serialization failed', { error });
      throw error;
    }
  }

  public deserialize(buffer: Buffer): unknown {
    try {
      const json = buffer.toString('utf-8');
      return JSON.parse(json);
    } catch (error) {
      logger.error('JSON deserialization failed', { error });
      throw error;
    }
  }

  public getFormat(): string {
    return 'json';
  }
}

/**
 * MessagePack-style Serializer (lightweight binary format)
 * Simplified implementation for demonstration
 */
export class BinarySerializer implements ISerializer {
  public serialize(data: unknown): Buffer {
    // Simplified binary encoding
    const json = JSON.stringify(data);
    const buffer = Buffer.allocUnsafe(4 + json.length);
    buffer.writeUInt32BE(json.length, 0);
    buffer.write(json, 4, 'utf-8');
    return buffer;
  }

  public deserialize(buffer: Buffer): unknown {
    try {
      const length = buffer.readUInt32BE(0);
      const json = buffer.toString('utf-8', 4, 4 + length);
      return JSON.parse(json);
    } catch (error) {
      logger.error('Binary deserialization failed', { error });
      throw error;
    }
  }

  public getFormat(): string {
    return 'binary';
  }
}

/**
 * Serializer factory
 */
export class SerializerFactory {
  private static serializers: Map<string, ISerializer> = new Map([
    ['json', new JSONSerializer()],
    ['binary', new BinarySerializer()],
  ]);

  public static getSerializer(format: string): ISerializer {
    const serializer = this.serializers.get(format.toLowerCase());
    if (!serializer) {
      throw new Error(`Unsupported serialization format: ${format}`);
    }
    return serializer;
  }

  public static registerSerializer(format: string, serializer: ISerializer): void {
    this.serializers.set(format.toLowerCase(), serializer);
    logger.info(`Serializer registered: ${format}`);
  }

  public static getAvailableFormats(): string[] {
    return Array.from(this.serializers.keys());
  }
}
