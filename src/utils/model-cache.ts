import { openDB, IDBPDatabase } from 'idb';

interface ModelCache {
  modelPath: string;
  modelData: ArrayBuffer;
  timestamp: number;
  version: string;
}

class ModelCacheManager {
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = 'model-cache';
  private readonly STORE_NAME = 'models';
  private readonly VERSION = 1;
  private readonly MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 1 week

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(this.DB_NAME, this.VERSION, {
      upgrade(db: IDBPDatabase) {
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'modelPath' });
        }
      },
    });

    // Clean up old models
    await this.cleanOldModels();
  }

  async saveModel(modelPath: string, modelData: ArrayBuffer, version: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const cache: ModelCache = {
      modelPath,
      modelData,
      timestamp: Date.now(),
      version,
    };
    await this.db.put(this.STORE_NAME, cache);
  }

  async getModel(modelPath: string, version: string): Promise<ArrayBuffer | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const cache = await this.db.get(this.STORE_NAME, modelPath) as ModelCache | undefined;
    
    if (!cache) return null;
    if (cache.version !== version) return null;
    if (Date.now() - cache.timestamp > this.MAX_AGE) {
      await this.db.delete(this.STORE_NAME, modelPath);
      return null;
    }

    return cache.modelData;
  }

  private async cleanOldModels(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Date.now();
    const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    const keys = await store.getAllKeys();

    for (const key of keys) {
      const cache = await store.get(key) as ModelCache | undefined;
      if (cache && now - cache.timestamp > this.MAX_AGE) {
        await store.delete(key);
      }
    }

    await tx.done;
  }

  async clearCache(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    await this.db.clear(this.STORE_NAME);
  }
}

export const modelCache = new ModelCacheManager(); 