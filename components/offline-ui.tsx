/**
 * Offline Badge and Tile Management UI Components
 * 
 * Provides user interface elements for:
 * - Displaying offline status and connectivity
 * - Managing cached tiles
 * - Showing download progress
 * - Configuring offline preferences
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  Trash2, 
  Settings, 
  MapPin,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

import { indexedDB } from '@/lib/indexed-db';
// import { tilePackageManager } from '@/lib/tile-packaging';
import { tideControlManager } from '@/lib/controls';

interface OfflineStatus {
  isOnline: boolean;
  isOfflineMode: boolean;
  cachedTiles: number;
  totalSize: number;
  lastSync: string | null;
}

interface TileInfo {
  id: string;
  location: string;
  size: number;
  lastAccessed: string;
  expires: string;
  bounds: { north: number; south: number; east: number; west: number };
}

interface OfflineSettings {
  autoDownloadTiles: boolean;
  maxStorageMB: number;
  tileExpiryDays: number;
  onlyOnWifi: boolean;
}

export function OfflineBadge() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: navigator.onLine,
    isOfflineMode: false,
    cachedTiles: 0,
    totalSize: 0,
    lastSync: null
  });

  useEffect(() => {
    const updateOnlineStatus = () => {
      setStatus(prev => ({ ...prev, isOnline: navigator.onLine }));
    };

    const updateTileStatus = async () => {
      try {
        const stats = await indexedDB.getStats();
        setStatus(prev => ({
          ...prev,
          cachedTiles: stats.tileCount,
          totalSize: stats.totalSize
        }));
      } catch (error) {
        console.error('Failed to get tile stats:', error);
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    updateOnlineStatus();
    updateTileStatus();
    
    const interval = setInterval(updateTileStatus, 30000); // Update every 30 seconds
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    if (!status.isOnline) return 'destructive';
    if (status.cachedTiles === 0) return 'secondary';
    if (status.cachedTiles < 10) return 'outline';
    return 'default';
  };

  const getStatusText = () => {
    if (!status.isOnline) return 'ออฟไลน์';
    if (status.cachedTiles === 0) return 'ไม่มีข้อมูลแคช';
    return `ออฟไลน์ (${status.cachedTiles} ไทล์)`;
  };

  const getStatusIcon = () => {
    if (!status.isOnline) return <WifiOff className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  return (
    <Badge variant={getStatusColor()} className="flex items-center gap-2">
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </Badge>
  );
}

function TileManagementPanel() {
  const [tiles, setTiles] = useState<TileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('tiles');

  const loadTiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const allTiles = await indexedDB.getAllTiles();
      
      const tileInfo: TileInfo[] = allTiles.map(tile => ({
        id: tile.id,
        location: `Tile ${tile.id.split('_').slice(1).join(', ')}`,
        size: tile.size,
        lastAccessed: new Date(tile.lastAccessed).toLocaleString('th-TH'),
        expires: new Date(tile.timestamp + 72 * 60 * 60 * 1000).toLocaleString('th-TH'),
        bounds: { north: 0, south: 0, east: 0, west: 0 } // Would be extracted from tile data
      }));
      
      setTiles(tileInfo.sort((a, b) => 
        new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
      ));
    } catch (error) {
      console.error('Failed to load tiles:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTiles();
  }, [loadTiles]);

  const deleteSelectedTiles = async () => {
    if (selectedTiles.length === 0) return;
    
    setIsLoading(true);
    try {
      for (const tileId of selectedTiles) {
        await indexedDB.deleteTile(tileId);
      }
      setSelectedTiles([]);
      await loadTiles();
    } catch (error) {
      console.error('Failed to delete tiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTileSelection = (tileId: string) => {
    setSelectedTiles(prev => 
      prev.includes(tileId) 
        ? prev.filter(id => id !== tileId)
        : [...prev, tileId]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            จัดการข้อมูลแคช
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTiles}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tiles">ไทล์ที่บันทึก</TabsTrigger>
            <TabsTrigger value="settings">การตั้งค่า</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tiles" className="space-y-4">
            {selectedTiles.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>เลือก {selectedTiles.length} รายการ</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelectedTiles}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบที่เลือก
                </Button>
              </div>
            )}
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                กำลังโหลด...
              </div>
            ) : tiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ยังไม่มีข้อมูลไทล์ที่บันทึก</p>
                <p className="text-sm">ข้อมูลจะถูกบันทึกเมื่อคุณดูพยากรณ์ในพื้นที่ต่างๆ</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tiles.map(tile => (
                  <TileListItem
                    key={tile.id}
                    tile={tile}
                    isSelected={selectedTiles.includes(tile.id)}
                    onToggleSelection={toggleTileSelection}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="settings">
            <OfflineSettingsPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface TileListItemProps {
  tile: TileInfo;
  isSelected: boolean;
  onToggleSelection: (tileId: string) => void;
}

function TileListItem({ tile, isSelected, onToggleSelection }: TileListItemProps) {
  const formatFileSize = (bytes: number): string => {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isExpired = new Date(tile.expires) < new Date();

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected ? 'bg-accent border-accent-foreground' : 'hover:bg-muted/50'
      }`}
      onClick={() => onToggleSelection(tile.id)}
    >
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(tile.id)}
          className="rounded"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{tile.location}</span>
            {isExpired && (
              <Badge variant="outline" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                หมดอายุ
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {tile.lastAccessed}
            </span>
            <span className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              {formatFileSize(tile.size)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OfflineSettingsPanel() {
  const [settings, setSettings] = useState<OfflineSettings>({
    autoDownloadTiles: true,
    maxStorageMB: 50,
    tileExpiryDays: 30,
    onlyOnWifi: true
  });

  const [currentStorage, setCurrentStorage] = useState({ used: 0, available: 0 });

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('offline-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load offline settings:', error);
      }
    }

    // Get current storage usage
    indexedDB.getStats().then(stats => {
      setCurrentStorage({
        used: stats.totalSize / (1024 * 1024), // Convert to MB
        available: settings.maxStorageMB - (stats.totalSize / (1024 * 1024))
      });
    });
  }, []);

  const updateSetting = <K extends keyof OfflineSettings>(
    key: K, 
    value: OfflineSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('offline-settings', JSON.stringify(newSettings));
  };

  const clearAllData = async () => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลแคชทั้งหมด?')) {
      try {
        await indexedDB.clearAll();
        alert('ลบข้อมูลแคชเรียบร้อยแล้ว');
      } catch (error) {
        console.error('Failed to clear cache:', error);
        alert('ไม่สามารถลบข้อมูลแคชได้');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">การตั้งค่าออฟไลน์</h3>
        
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            ดาวน์โหลดไทล์อัตโนมัติ
          </label>
          <Switch
            checked={settings.autoDownloadTiles}
            onCheckedChange={(checked) => updateSetting('autoDownloadTiles', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            ใช้ WiFi เท่านั้น
          </label>
          <Switch
            checked={settings.onlyOnWifi}
            onCheckedChange={(checked) => updateSetting('onlyOnWifi', checked)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">ที่เก็บข้อมูล</h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              ขนาดสูงสุด (MB)
            </label>
            <input
              type="number"
              min="10"
              max="500"
              value={settings.maxStorageMB}
              onChange={(e) => updateSetting('maxStorageMB', parseInt(e.target.value))}
              className="w-20 px-2 py-1 border rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              อายุข้อมูล (วัน)
            </label>
            <input
              type="number"
              min="7"
              max="90"
              value={settings.tileExpiryDays}
              onChange={(e) => updateSetting('tileExpiryDays', parseInt(e.target.value))}
              className="w-20 px-2 py-1 border rounded"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>พื้นที่ใช้</span>
            <span>{currentStorage.used.toFixed(1)} / {settings.maxStorageMB} MB</span>
          </div>
          <Progress 
            value={(currentStorage.used / settings.maxStorageMB) * 100} 
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">การจัดการข้อมูล</h3>
        
        <Button 
          variant="destructive" 
          onClick={clearAllData}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          ลบข้อมูลแคชทั้งหมด
        </Button>
      </div>
    </div>
  );
}

// Export components
export { TileManagementPanel, OfflineSettingsPanel };