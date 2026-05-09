import { useState, useEffect, useCallback } from 'react';
import { logsAPI } from '../services/api';
import FileUpload from '../components/FileUpload';
import { FileText, Trash2, ChevronDown, ChevronUp, Calendar, AlertCircle, Loader2 } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [deleting, setDeleting] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await logsAPI.getAll();
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this log file and all its associated errors?')) return;
    setDeleting(id);
    try {
      await logsAPI.delete(id);
      setLogs((prev) => prev.filter((l) => l._id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Log Files</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Upload and manage your log files</p>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6' }}>{logs.length}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Files</div>
        </div>
      </div>

      <FileUpload onUploadSuccess={fetchLogs} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p>Loading log files...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No log files uploaded yet. Upload your first log file above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {logs.map((log) => (
            <div key={log._id} className="glass-panel" style={{ overflow: 'hidden' }}>
              {/* Log Header */}
              <div
                style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => toggleExpand(log._id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(59,130,246,0.15)', borderRadius: '8px', padding: '0.5rem', flexShrink: 0 }}>
                    <FileText size={20} style={{ color: '#3b82f6' }} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.filename}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      <Calendar size={12} />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <button
                    id={`delete-log-${log._id}`}
                    className="btn btn-danger"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(log._id); }}
                    disabled={deleting === log._id}
                  >
                    {deleting === log._id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                    Delete
                  </button>
                  {expanded[log._id] ? <ChevronUp size={20} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />}
                </div>
              </div>

              {/* Log Content */}
              {expanded[log._id] && (
                <div style={{ borderTop: '1px solid var(--border-color)', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <AlertCircle size={14} /> Log content preview
                  </div>
                  <pre style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    padding: '1rem',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: '350px',
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    fontFamily: "'Fira Code', 'Courier New', monospace",
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {log.content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
