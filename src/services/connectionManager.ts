    /**
 * Smart Connection Manager
 * Automatically detects and switches between local network and cloud backends
 */

interface BackendConfig {
  url: string;
  priority: number;
  timeout: number;
  name: string;
}

interface ConnectionStatus {
  backend: 'local' | 'cloud' | 'offline';
  url: string;
  latency: number;
  online: boolean;
}

class ConnectionManager {
  private backends: BackendConfig[] = [];
  private currentBackend: string | null = null;
  private statusListeners: Array<(status: ConnectionStatus) => void> = [];
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadConfiguration();
    this.startMonitoring();
  }

  /**
   * Load configuration from localStorage or use defaults
   */
  private loadConfiguration() {
    try {
      const saved = localStorage.getItem('connection_config');
      if (saved) {
        const config = JSON.parse(saved);
        this.backends = [
          {
            url: config.localUrl || import.meta.env.VITE_LOCAL_API_URL || 'http://192.168.1.100:3000',
            priority: 1,
            timeout: config.localTimeout || 2000,
            name: 'Local Network',
          },
          {
            url: config.cloudUrl || import.meta.env.VITE_CLOUD_API_URL || 'https://carefam-lab-1e0cbe42a3ac.herokuapp.com',
            priority: 2,
            timeout: config.cloudTimeout || 5000,
            name: 'Cloud Server',
          },
        ].filter(backend => backend.url); // Remove empty URLs
      } else {
        // Use defaults from environment
        this.backends = [
          {
            url: import.meta.env.VITE_LOCAL_API_URL || 'http://192.168.1.100:3000',
            priority: 1,
            timeout: 2000,
            name: 'Local Network',
          },
          {
            url: import.meta.env.VITE_CLOUD_API_URL || 'https://carefam-lab-1e0cbe42a3ac.herokuapp.com',
            priority: 2,
            timeout: 5000,
            name: 'Cloud Server',
          },
          {
            url: import.meta.env.VITE_API_URL || 'http://localhost:3000',
            priority: 3,
            timeout: 3000,
            name: 'Development',
          },
        ].filter(backend => backend.url);
      }
    } catch (error) {
      console.error('Failed to load connection config:', error);
      // Fallback to environment variables
      this.backends = [
        {
          url: import.meta.env.VITE_LOCAL_API_URL || 'http://192.168.1.100:3000',
          priority: 1,
          timeout: 2000,
          name: 'Local Network',
        },
        {
          url: import.meta.env.VITE_CLOUD_API_URL || 'https://carefam-lab-1e0cbe42a3ac.herokuapp.com',
          priority: 2,
          timeout: 5000,
          name: 'Cloud Server',
        },
      ].filter(backend => backend.url);
    }
  }

  /**
   * Reload configuration from localStorage
   */
  reloadConfiguration() {
    this.loadConfiguration();
    console.log('🔄 Connection configuration reloaded');
  }

  /**
   * Sync configuration from backend server
   */
  async syncConfigurationFromServer(serverUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${serverUrl}/settings/connection/config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.value) {
          // Save to localStorage
          localStorage.setItem('connection_config', JSON.stringify(data.value));
          // Reload configuration
          this.loadConfiguration();
          console.log('✅ Configuration synced from server');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to sync configuration from server:', error);
      return false;
    }
  }

  /**
   * Get the best available backend URL
   */
  async getBestBackend(): Promise<string> {
    // Try each backend in priority order
    for (const backend of this.backends) {
      const isAvailable = await this.checkBackend(backend.url, backend.timeout);
      if (isAvailable) {
        this.currentBackend = backend.url;
        this.notifyListeners({
  /**
   * Start monitoring connection status
   */
  private startMonitoring() {
    // Get monitoring interval from config or use default
    const getMonitoringInterval = () => {
      try {
        const saved = localStorage.getItem('connection_config');
        if (saved) {
          const config = JSON.parse(saved);
          return config.monitoringInterval || 30000;
        }
      } catch (error) {
        console.error('Failed to get monitoring interval:', error);
      }
      return 30000; // Default 30 seconds
    };

    const interval = getMonitoringInterval();
    
    // Check at configured interval
    this.checkInterval = setInterval(async () => {
      await this.getBestBackend();
    }, interval);

    // Initial check
    this.getBestBackend();
  } this.notifyListeners({
      backend: 'offline',
      url: '',
      latency: 0,
      online: false,
    });

    throw new Error('All backends unavailable - offline mode');
  }

  /**
   * Check if a backend is available
   */
  private async checkBackend(url: string, timeout: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${url}/health`, {
        signal: controller.signal,
  /**
   * Force switch to specific backend
   */
  async switchToBackend(url: string): Promise<boolean> {
    const isAvailable = await this.checkBackend(url, 5000);
    if (isAvailable) {
      this.currentBackend = url;
      return true;
    }
    return false;
  }

  /**
   * Get current backend configuration
   */
  getBackendConfiguration() {
    return this.backends.map(backend => ({
      ...backend,
      isCurrent: backend.url === this.currentBackend,
    }));
  }
}  * Measure connection latency
   */
  async measureLatency(url: string): Promise<number> {
    const start = Date.now();
    try {
      await fetch(`${url}/health`, { method: 'HEAD' });
      return Date.now() - start;
    } catch {
      return Infinity;
    }
  }

  /**
   * Start monitoring connection status
   */
  private startMonitoring() {
    // Check every 30 seconds
    this.checkInterval = setInterval(async () => {
      await this.getBestBackend();
    }, 30000);

    // Initial check
    this.getBestBackend();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void) {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: ConnectionStatus) {
    this.statusListeners.forEach(callback => callback(status));
  }

  /**
   * Get current backend URL
   */
  getCurrentBackend(): string | null {
    return this.currentBackend;
  }

  /**
   * Force switch to specific backend
   */
  async switchToBackend(url: string): Promise<boolean> {
    const isAvailable = await this.checkBackend(url, 5000);
    if (isAvailable) {
      this.currentBackend = url;
      return true;
    }
    return false;
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();

// Export for use in API service
export default connectionManager;
