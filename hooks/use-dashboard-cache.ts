import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface DashboardCacheData {
  stats: any;
  analytics: any;
  emailAnalytics?: any;
  omnichannelReplies?: any;
  recentCalls: any[];
  leadsByDate: any[];
  adminKpis?: any;
  advisorId?: string;
  isAdmin: boolean;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items in cache
  localStorageKey: string;
}

class DashboardCache {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;
  private localStorageKey: string;

  constructor(config: CacheConfig) {
    this.config = config;
    this.localStorageKey = config.localStorageKey;
    this.loadFromStorage();
  }

  private generateKey(dataType: string, advisorId?: string, isAdmin: boolean = false): string {
    return `${dataType}_${advisorId || 'admin'}_${isAdmin}`;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = new Map(parsed);
        this.cleanExpired();
      }
    } catch (error) {
      console.warn('Failed to load dashboard cache from localStorage:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const serialized = JSON.stringify(Array.from(this.cache.entries()));
      localStorage.setItem(this.localStorageKey, serialized);
    } catch (error) {
      console.warn('Failed to save dashboard cache to localStorage:', error);
    }
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  private enforceMaxSize(): void {
    if (this.cache.size <= this.config.maxSize) return;

    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, this.cache.size - this.config.maxSize);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  get(dataType: string, advisorId?: string, isAdmin: boolean = false): any | null {
    const key = this.generateKey(dataType, advisorId, isAdmin);
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(dataType: string, data: any, advisorId?: string, isAdmin: boolean = false): void {
    const key = this.generateKey(dataType, advisorId, isAdmin);
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.config.ttl,
    });
    
    this.enforceMaxSize();
    this.saveToStorage();
  }

  clear(): void {
    this.cache.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.localStorageKey);
    }
  }

  invalidateByAdvisor(advisorId?: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(advisorId || 'admin')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    this.saveToStorage();
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
    };
  }
}

export function useDashboardCache() {
  const cacheRef = useRef<DashboardCache | null>(null);
  const [cacheStats, setCacheStats] = useState({ size: 0, maxSize: 20 });

  useEffect(() => {
    if (!cacheRef.current) {
      cacheRef.current = new DashboardCache({
        ttl: 10 * 60 * 1000, // 10 minutes
        maxSize: 20, // Maximum 20 cached datasets
        localStorageKey: 'dashboard-cache-v1',
      });
      setCacheStats(cacheRef.current.getStats());
    }
  }, []);

  const getCachedData = useCallback((dataType: string, advisorId?: string, isAdmin: boolean = false) => {
    if (!cacheRef.current) return null;
    return cacheRef.current.get(dataType, advisorId, isAdmin);
  }, []);

  const setCachedData = useCallback((dataType: string, data: any, advisorId?: string, isAdmin: boolean = false) => {
    if (!cacheRef.current) return;
    cacheRef.current.set(dataType, data, advisorId, isAdmin);
    setCacheStats(cacheRef.current.getStats());
  }, []);

  const clearCache = useCallback(() => {
    if (!cacheRef.current) return;
    cacheRef.current.clear();
    setCacheStats(cacheRef.current.getStats());
  }, []);

  const invalidateByAdvisor = useCallback((advisorId?: string) => {
    if (!cacheRef.current) return;
    cacheRef.current.invalidateByAdvisor(advisorId);
    setCacheStats(cacheRef.current.getStats());
  }, []);

  return {
    getCachedData,
    setCachedData,
    clearCache,
    invalidateByAdvisor,
    cacheStats,
  };
}
