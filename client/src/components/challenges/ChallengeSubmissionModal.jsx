import { useState } from 'react';
import GlassCard from '../ui/GlassCard';
import api from '../../services/api';
import './ChallengeSubmissionModal.css';

export default function ChallengeSubmissionModal({ challenge, onClose, onSuccess }) {
  const [proofText, setProofText] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads')) {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      return `${baseUrl}${url}`;
    }
    return url;
  };

  const MediaPreview = ({ url }) => {
    if (!url) return null;
    const fullUrl = getFullMediaUrl(url);
    const isVideo = /\.(mp4|webm|ogg|mov)$|^data:video\//i.test(fullUrl);

    return (
      <div className="proof-preview-container">
        {isVideo ? (
          <video src={fullUrl} controls style={{ width: '100%', maxHeight: '200px', borderRadius: '8px' }} />
        ) : (
          <img src={fullUrl} alt="Preview" style={{ width: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'contain' }} />
        )}
        <button type="button" className="remove-preview-btn" onClick={() => setProofUrl('')}>Remove ×</button>
      </div>
    );
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProofUrl(data.data.url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proofUrl) { setError('Proof URL (Image/Video) is required'); return; }
    
    setLoading(true);
    try {
      await api.post(`/challenges/${challenge._id}/submit-proof`, {
        proofText,
        proofUrl
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit proof');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <GlassCard className="submission-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📤 Submit Proof</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <p className="modal-subtitle">Submitting for: <strong>{challenge.title}</strong></p>

        <form onSubmit={handleSubmit} className="submission-form">
          {error && <div className="modal-error">{error}</div>}
          
          <div className="modal-field">
            <label>Upload Proof (Image/Video)</label>
            <input type="file" onChange={handleFileUpload} accept="image/*,video/*" />
            {uploading && <p className="uploading-text" style={{ color: 'var(--volt)', fontSize: '0.8rem' }}>Uploading... ⏳</p>}
          </div>

          <div className="modal-field">
            <label>OR Paste Media URL</label>
            <input 
              type="text" 
              value={proofUrl} 
              onChange={e => setProofUrl(e.target.value)} 
              placeholder="https://imgur.com/your-proof.jpg" 
              required
            />
          </div>
          <MediaPreview url={proofUrl} />

          <div className="modal-field">
            <label>Description / Description of Work</label>
            <textarea 
              value={proofText} 
              onChange={e => setProofText(e.target.value)} 
              placeholder="Briefly describe what you did..."
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Submitting...' : 'Send for Review 🚀'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
