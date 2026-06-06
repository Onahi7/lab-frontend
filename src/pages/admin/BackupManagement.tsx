import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Database, Download, Trash2, Play, RefreshCw, HardDrive, 
  Clock, FileArchive, AlertCircle, CheckCircle2, Info, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { RoleLayout } from '@/components/layout/RoleLayout';
import api from '@/services/api';

interface BackupFile {
  filename: string;
  size: number;
  collections: number;
  documents: number;
  duration: number;
  createdAt: string;
}

interface BackupStatus {
  lastBackup: BackupFile | null;
  totalBackups: number;
  totalSizeBytes: number;
  diskAvailable: boolean;
  backupDir: string;
  atlasEnabled: boolean;
  atlasNote: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export default function BackupManagement() {
  const { hasRole, profile, primaryRole } = useAuth();
  const isAdmin = hasRole('admin');
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery<BackupStatus>({
    queryKey: ['backup-status'],
    queryFn: async () => {
      const response = await api.get('/backup/status');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const { data: backups = [], isLoading: listLoading } = useQuery<BackupFile[]>({
    queryKey: ['backup-list'],
    queryFn: async () => {
      const response = await api.get('/backup/list');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const runBackup = useMutation({
    mutationFn: async () => {
      const response = await api.post('/backup/run');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['backup-status'] });
      queryClient.invalidateQueries({ queryKey: ['backup-list'] });
      toast.success(`Backup complete: ${data.filename} (${formatBytes(data.size)})`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Backup failed');
    },
  });

  const deleteBackup = useMutation({
    mutationFn: async (filename: string) => {
      await api.delete(`/backup/${filename}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-status'] });
      queryClient.invalidateQueries({ queryKey: ['backup-list'] });
      toast.success('Backup deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Delete failed');
    },
  });

  const handleDownload = (filename: string) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const url = `/api/backup/download/${encodeURIComponent(filename)}`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.blob())
      .then(blob => {
        const dlUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(dlUrl);
      })
      .catch(() => toast.error('Download failed'));
  };

  const lastBackup = status?.lastBackup;
  const lastBackupAge = lastBackup ? Date.now() - new Date(lastBackup.createdAt).getTime() : Infinity;
  const isStale = lastBackupAge > 25 * 60 * 60 * 1000; // older than 25 hours

  return (
    <RoleLayout 
      title="Database Backups" 
      subtitle="Daily automated backups with downloadable exports"
      role={primaryRole || 'admin'} 
      userName={profile?.full_name}
    >
      <div className="space-y-6">
        {/* Status row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${isStale ? 'bg-status-warning/10' : 'bg-status-normal/10'}`}>
                  {isStale ? (
                    <AlertCircle className="h-6 w-6 text-status-warning" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-status-normal" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Last Backup</p>
                  <p className="text-lg font-bold">
                    {lastBackup ? timeAgo(lastBackup.createdAt) : 'Never'}
                  </p>
                  {isStale && <p className="text-xs text-status-warning">Backup is overdue</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Backups</p>
                  <p className="text-lg font-bold">{status?.totalBackups ?? 0}</p>
                  <p className="text-xs text-muted-foreground">7-day retention</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <HardDrive className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Disk Usage</p>
                  <p className="text-lg font-bold">{formatBytes(status?.totalSizeBytes ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">local storage</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-violet-500/10">
                  <Calendar className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Schedule</p>
                  <p className="text-lg font-bold">Daily 00:00</p>
                  <p className="text-xs text-muted-foreground">midnight UTC</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Atlas info banner */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">Backup Strategy</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This server runs on MongoDB Atlas free tier (M0), which does <strong>not</strong> include 
                  automated daily snapshots. The system takes a local JSON export of all collections at midnight 
                  every day and retains the last 7 days.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  For production-grade offsite backups, consider upgrading to Atlas M10+ (which includes 
                  continuous backups and point-in-time recovery), or configuring cloud storage upload.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Trigger a manual backup or refresh the list</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {isAdmin && (
                <Button 
                  onClick={() => runBackup.mutate()} 
                  disabled={runBackup.isPending}
                >
                  <Play className={`h-4 w-4 mr-2 ${runBackup.isPending ? 'animate-pulse' : ''}`} />
                  {runBackup.isPending ? 'Running Backup...' : 'Run Backup Now'}
                </Button>
              )}
              <Button 
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['backup-status'] });
                  queryClient.invalidateQueries({ queryKey: ['backup-list'] });
                  toast.success('Refreshed');
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backups list */}
        <Card>
          <CardHeader>
            <CardTitle>Available Backups</CardTitle>
            <CardDescription>
              {backups.length} backup{backups.length !== 1 ? 's' : ''} stored. 
              Click any file to download or delete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listLoading || statusLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : backups.length === 0 ? (
              <div className="text-center py-12">
                <FileArchive className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No backups yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Backups run automatically at midnight, or you can trigger one manually.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="text-left px-4 py-2">Filename</th>
                      <th className="text-left px-4 py-2">Created</th>
                      <th className="text-left px-4 py-2">Age</th>
                      <th className="text-left px-4 py-2">Size</th>
                      <th className="text-right px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {backups.map((backup) => (
                      <tr key={backup.filename} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileArchive className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-xs">{backup.filename}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(backup.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {timeAgo(backup.createdAt)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatBytes(backup.size)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDownload(backup.filename)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete backup ${backup.filename}?`)) {
                                    deleteBackup.mutate(backup.filename);
                                  }
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How to restore */}
        <Card>
          <CardHeader>
            <CardTitle>Restoring from Backup</CardTitle>
            <CardDescription>How to recover data from a backup file</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div>
              <p className="font-semibold mb-1">Backup format</p>
              <p className="text-muted-foreground">
                Each backup is a gzipped JSON file containing all collections. The structure is:
                <code className="block mt-1 p-2 bg-muted rounded text-xs">
                  {`{ meta: {...}, collections: { orders: [...], patients: [...], ... } }`}
                </code>
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">To restore</p>
              <p className="text-muted-foreground">
                Decompress the file (<code className="px-1 bg-muted rounded">gunzip backup.json.gz</code>), 
                then use <code className="px-1 bg-muted rounded">mongoimport</code> or a custom script to 
                load each collection into the database. For full disaster recovery, contact your 
                technical administrator.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">To verify a backup</p>
              <p className="text-muted-foreground">
                Decompress and open the JSON file. The <code className="px-1 bg-muted rounded">meta</code> section 
                shows when the backup was taken and how many documents are in each collection.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
