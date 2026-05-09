import { useState, useEffect, useCallback } from 'react';
import { fixesAPI } from '../services/api';
import { Sparkles, Loader2, FileText, Wrench, RefreshCw, Trash2 } from 'lucide-react';

function FixCard({ entry, onDelete, onRegenerate }) {
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setErrorMsg('');
    try {
      await onDelete(entry._id);
    } catch (err) {
      const msg = err?.response?.data?.msg || 'Failed to delete fix.';
      setErrorMsg(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setErrorMsg('');
    try {
      await onRegenerate(entry.errorEntryId);
    } catch (err) {
      const msg = err?.response?.data?.msg || 'Failed to regenerate fix.';
      setErrorMsg(msg);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="glass-panel error-card animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <span className="error-tag" style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--success)', borderColor: 'rgba(34,197,94,0.2)' }}>
          <Sparkles size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          AI Fix {entry.lineNumber ? `· Line ${entry.lineNumber}` : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <FileText size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{entry.filename}</span>
        </div>
      </div>

      <p style={{ color: 'var(--text-main)', fontFamily: "'Fira Code', monospace", fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', wordBreak: 'break-all', lineHeight: 1.6 }}>
        {entry.errorMessage}
      </p>

      <div className="ai-fix-section">
        <p style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Explanation</p>
        <div className="ai-explanation ai-content">{entry.explanation}</div>

        <p style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', marginTop: '1rem' }}>Suggested Fix</p>
        <div className="ai-content">{entry.fix}</div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <button
          className="btn"
          style={{ flex: 1, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}
          onClick={handleRegenerate}
          disabled={regenerating || deleting}
        >
          {regenerating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Regenerating...</> : <><RefreshCw size={14} /> Generate New Fix</>}
        </button>
        <button
          className="btn btn-danger"
          style={{ flex: 1 }}
          onClick={handleDelete}
          disabled={deleting || regenerating}
        >
          {deleting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Deleting...</> : <><Trash2 size={14} /> Delete Fix</>}
        </button>
      </div>

      {errorMsg && (
        <p style={{ marginTop: '0.75rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}

export default function FixesPage() {
  const [fixes, setFixes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFixes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fixesAPI.getAll();
      setFixes(res.data);
    } catch (err) {
      console.error('Failed to fetch fixes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFixes();
  }, [fetchFixes]);

  const handleDeleteFix = async (fixId) => {
    await fixesAPI.delete(fixId);
    setFixes((prev) => prev.filter((item) => item._id !== fixId));
  };

  const handleRegenerateFix = async (errorEntryId) => {
    const response = await fixesAPI.regenerate(errorEntryId);
    const regeneratedError = response.data;

    const refreshed = await fixesAPI.getAll();
    setFixes(refreshed.data);
    return regeneratedError;
  };

  const grouped = fixes.reduce((acc, item) => {
    if (!acc[item.filename]) acc[item.filename] = [];
    acc[item.filename].push(item);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Generated Fixes</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>All AI fixes with explanations, saved to MongoDB</p>
        </div>
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>{fixes.length}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Fixes</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p>Loading generated fixes...</p>
        </div>
      ) : fixes.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Wrench size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No fixes generated yet. Go to Errors and click Generate AI Fix.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([filename, fileFixes]) => (
          <div key={filename} style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <FileText size={18} style={{ color: '#3b82f6' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{filename}</h2>
              <span style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--success)', borderRadius: '9999px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}>
                {fileFixes.length} fix{fileFixes.length > 1 ? 'es' : ''}
              </span>
            </div>
            <div className="card-grid">
              {fileFixes.map((item) => (
                <FixCard
                  key={item._id}
                  entry={item}
                  onDelete={handleDeleteFix}
                  onRegenerate={handleRegenerateFix}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
