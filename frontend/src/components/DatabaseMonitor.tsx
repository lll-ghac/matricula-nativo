import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Database, RefreshCw, Server, Zap, Users } from 'lucide-react';

// Interfaces for the PostgreSQL monitor API
interface HealthData {
  version: string;
  current_db: string;
  db_size: string;
  total_connections: number;
  active_connections: number;
}

interface ConnectionData {
  total_connections: number;
  active_connections: number;
  idle_connections: number;
}

interface SizeData {
  size_bytes: number;
  size_pretty: string;
}

const DatabaseMonitor: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [connections, setConnections] = useState<ConnectionData | null>(null);
  const [size, setSize] = useState<SizeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [healthRes, connectionsRes, sizeRes] = await Promise.all([
        fetch('/api/admin/monitor/health', { credentials: 'include' }),
        fetch('/api/admin/monitor/connections', { credentials: 'include' }),
        fetch('/api/admin/monitor/size', { credentials: 'include' })
      ]);

      if (!healthRes.ok || !connectionsRes.ok || !sizeRes.ok) {
        throw new Error('Failed to fetch monitor data. Ensure the database migration for monitor functions has been applied.');
      }

      const healthData = await healthRes.json();
      const connectionsData = await connectionsRes.json();
      const sizeData = await sizeRes.json();

      setHealth(healthData);
      setConnections(connectionsData);
      setSize(sizeData);
      setLastUpdate(new Date());
      setError(null);

    } catch (err) {
      console.error('Error fetching monitor data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatus = () => {
    if (error) return { text: 'Error', color: 'text-red-600', icon: <AlertTriangle className="w-6 h-6 text-red-600" /> };
    if (!health || !connections) return { text: 'Unknown', color: 'text-gray-600', icon: <Server className="w-6 h-6 text-gray-600" /> };
    // Example logic: warning if more than 20 active connections
    if (connections.active_connections > 20) return { text: 'High Load', color: 'text-yellow-600', icon: <AlertTriangle className="w-6 h-6 text-yellow-600" /> };
    return { text: 'Healthy', color: 'text-green-600', icon: <CheckCircle className="w-6 h-6 text-green-600" /> };
  };

  const status = getStatus();

  if (loading && !health) {
    return (
      <div className="ios-card p-8 text-center">
        <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: 'var(--color-primary)' }} />
        <p className="ios-title">Loading Database Monitor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="ios-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {status.icon}
            <div>
              <h2 className="ios-title">PostgreSQL Database Monitor</h2>
              <p className={`text-sm font-medium ${status.color}`}>
                Status: {status.text}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`ios-btn ${autoRefresh ? 'ios-btn-primary' : 'ios-btn-secondary'} text-sm`}
            >
              <Activity className="w-4 h-4 mr-2" />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            <button onClick={fetchData} className="ios-btn ios-btn-secondary text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
        {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-800">An error occurred:</p>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ios-card p-4">
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>DB Version</p>
            <div className="flex items-center justify-between mt-1">
                <p className="text-lg font-bold truncate">{health?.version.split(' ')[0]}</p>
                <Server className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-xs mt-2 truncate" style={{ color: 'var(--color-text-secondary)' }}>{health?.version}</p>
        </div>

        <div className="ios-card p-4">
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Database Size</p>
            <div className="flex items-center justify-between mt-1">
                <p className="text-2xl font-bold">{size?.size_pretty}</p>
                <Database className="w-8 h-8 text-blue-500" />
            </div>
        </div>

        <div className="ios-card p-4">
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Total Connections</p>
            <div className="flex items-center justify-between mt-1">
                <p className="text-2xl font-bold">{connections?.total_connections}</p>
                <Users className="w-8 h-8 text-purple-500" />
            </div>
        </div>

        <div className="ios-card p-4">
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Active Connections</p>
            <div className="flex items-center justify-between mt-1">
                <p className="text-2xl font-bold">{connections?.active_connections}</p>
                <Zap className="w-8 h-8 text-green-500" />
            </div>
             <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                {connections?.idle_connections} idle
            </p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseMonitor;