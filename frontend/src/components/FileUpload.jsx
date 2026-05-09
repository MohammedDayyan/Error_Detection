import { useState, useRef, useCallback } from 'react';
import { logsAPI } from '../services/api';
import { UploadCloud, Loader2, X, CheckCircle2 } from 'lucide-react';

export default function FileUpload({ onUploadSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const uploadFile = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(log|txt)$/i)) {
      setError('Only .log or .txt files are accepted.');
      return;
    }
    setError('');
    setResult(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logfile', file);
      const res = await logsAPI.upload(formData);
      setResult(res.data);
      onUploadSuccess();
    } catch (err) {
      setError(err.response?.data?.msg || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    uploadFile(file);
  }, []);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div
        id="upload-zone"
        onClick={() => fileRef.current.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: `2px dashed ${dragging ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          background: dragging ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <input id="file-input" type="file" ref={fileRef} style={{ display: 'none' }} accept=".log,.txt" onChange={(e) => uploadFile(e.target.files[0])} />
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 size={40} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-muted)' }}>Uploading and parsing for errors...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <UploadCloud size={40} style={{ color: dragging ? '#3b82f6' : 'var(--text-muted)' }} />
            <p style={{ fontWeight: 600 }}>Drag & drop a log file or <span style={{ color: '#3b82f6' }}>click to browse</span></p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Supports .log and .txt files</p>
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
          <X size={16} /> {error}
        </div>
      )}
      {result && (
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', background: 'rgba(34,197,94,0.1)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
          <CheckCircle2 size={18} />
          <span>File uploaded! <strong>{result.errorsFound}</strong> error(s) detected and logged.</span>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
