/**
 * Smart API Service
 * Automatically switches between local network and cloud backends
 * Provides offline fallback with queue
 */

import axios, { AxiosInstance } from 'axios';
import { connectionManager } from './connectionManager';

// Offline queue for operations when both backends are down
interface QueuedOperation {
  id: string;
  method: string;
  url: string;
  data?: any;
  timestamp: number;
}

class SmartApiService {
  private api: AxiosInstance;
  private offlineQueue: QueuedOperation[] = [];
  private isOnline: boolean = true;

  constructor() {
    // Create axios instance with dynamic baseURL
    this.api = axios.create({
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup interceptors
    this.setupInterceptors();

    // Monitor connection status
    connectionManager.onStatusChange((status) => {
      this.isOnline = status.online;
      console.log(`📡 Connection: ${status.backend} (${status.url})`);

      // Process offline queue when back online
      if (this.isOnline && this.offlineQueue.length > 0) {
        this.processOfflineQueue();
      }
    });
  }

  private setupInterceptors() {
    // Request interceptor - Set dynamic baseURL
    this.api.interceptors.request.use(
      async (config) => {
        try {
          // Get best available backend
          const backend = await connectionManager.getBestBackend();
          config.baseURL = backend;

          // Add auth token
          const token = localStorage.getItem('access_token');
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }

          return config;
        } catch (error) {
          // All backends down - queue operation if it's a write
          if (config.method !== 'get') {
            this.queueOperation(config);
          }
          throw new Error('Offline - operation queued');
        }
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // If request failed, try alternative backend
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
          console.warn('⚠️ Backend failed, trying alternative...');
          // Connection manager will automatically try next backend
        }
        return Promise.reject(error);
      }
    );
  }

  private queueOperation(config: any) {
    const operation: QueuedOperation = {
      id: `${Date.now()}-${Math.random()}`,
      method: config.method || 'post',
      url: config.url || '',
      data: config.data,
      timestamp: Date.now(),
    };

    this.offlineQueue.push(operation);
    console.log(`📥 Queued operation: ${operation.method.toUpperCase()} ${operation.url}`);

    // Save to localStorage
    localStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
  }

  private async processOfflineQueue() {
    console.log(`📤 Processing ${this.offlineQueue.length} queued operations...`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const operation of queue) {
      try {
        await this.api.request({
          method: operation.method,
          url: operation.url,
          data: operation.data,
        });
        console.log(`✅ Processed: ${operation.method.toUpperCase()} ${operation.url}`);
      } catch (error) {
        console.error(`❌ Failed to process: ${operation.url}`, error);
        // Re-queue if still failing
        this.offlineQueue.push(operation);
      }
    }

    // Update localStorage
    localStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
  }

  // Expose axios instance for use
  getInstance(): AxiosInstance {
    return this.api;
  }

  // Get offline queue status
  getQueueStatus() {
    return {
      count: this.offlineQueue.length,
      operations: this.offlineQueue,
    };
  }

  // Clear offline queue
  clearQueue() {
    this.offlineQueue = [];
    localStorage.removeItem('offline_queue');
  }
}

// Singleton instance
export const smartApi = new SmartApiService();
export default smartApi.getInstance();
