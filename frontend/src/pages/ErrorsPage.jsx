import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorsAPI } from '../services/api';
import { AlertTriangle, Sparkles, Loader2, FileText, ChevronDown, ChevronUp } from 'lucide-react';

function ErrorCard({ error, onFixGenerated }) {
  const [fixing, setFixing] = useState(false);
  const [data, setData] = useState(error);
  const [expanded, setExpanded] = useState(false);
  const [fixError, setFixError] = useState('');

  const handleFix = async () => {
    setFixing(true);
    setFixError('');
    try {
      const res = await errorsAPI.generateFix(data._id);
      setData(res.data);
      setExpanded(true);
      if (onFixGenerated) onFixGenerated();
    } catch (err) {
      console.error('Fix generation failed', err);
      const msg = err?.response?.data?.msg || err?.message || 'Failed to generate AI fix. Please try again.';
      setFixError(msg);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="glass-panel error-card animate-fade-in">
      {/* Error Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <span className="error-tag">
          <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Error {data.lineNumber ? `· Line ${data.lineNumber}` : ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <FileText size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{data.filename}</span>
        </div>
      </div>

      <p style={{ color: 'var(--text-main)', fontFamily: "'Fira Code', monospace", fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', wordBreak: 'break-all', lineHeight: 1.6 }}>
        {data.errorMessage}
      </p>

      {/* AI Fix Button */}
      {!data.aiFix && (
        <>
          <button
            id={`fix-btn-${data._id}`}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '0.9rem' }}
            onClick={handleFix}
            disabled={fixing}
          >
            {fixing
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing with AI...</>
              : <><Sparkles size={16} /> Generate AI Fix</>
            }
          </button>
          {fixError && (
            <p style={{ marginTop: '0.75rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
              {fixError}
            </p>
          )}
        </>
      )}

      {/* AI Fix Result */}
      {data.aiFix && (
        <div>
          <button
            className="btn"
            style={{ width: '100%', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.2)', fontSize: '0.9rem' }}
            onClick={() => setExpanded(!expanded)}
          >
            <Sparkles size={16} />
            {expanded ? 'Hide AI Fix' : 'Show AI Fix'}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {expanded && (
            <div className="ai-fix-section">
              <p style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>💡 Explanation</p>
              <div className="ai-explanation ai-content">{data.aiExplanation}</div>

              <p style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', marginTop: '1rem' }}>🔧 Suggested Fix</p>
              <div className="ai-content">{data.aiFix}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ErrorsPage() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await errorsAPI.getAll();
      setErrors(res.data);
    } catch (err) {
      console.error('Failed to fetch errors', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  // Group errors by filename
  const grouped = errors.reduce((acc, error) => {
    const key = error.filename;
    if (!acc[key]) acc[key] = [];
    acc[key].push(error);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Detected Errors</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>AI-powered analysis and fix generation</p>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '0.75rem 1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger)' }}>{errors.length}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Errors</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
          <p>Scanning for errors...</p>
        </div>
      ) : errors.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No errors detected. Upload log files to start analysis.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([filename, fileErrors]) => (
          <div key={filename} style={{ marginBottom: '2.5rem' }}>
            {/* File Group Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <FileText size={18} style={{ color: '#3b82f6' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{filename}</h2>
              <span style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', borderRadius: '9999px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 600 }}>
                {fileErrors.length} error{fileErrors.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="card-grid">
              {fileErrors.map((error) => (
                <ErrorCard key={error._id} error={error} onFixGenerated={() => navigate('/dashboard/fixes')} />
              ))}
            </div>
          </div>
        ))
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
