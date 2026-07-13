import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Upload, FileText, Trash2, Database, Shield, 
  CheckCircle2, AlertTriangle, RefreshCw, BarChart2 
} from 'lucide-react';

interface Document {
  id: number;
  filename: string;
  category: string;
  uploaded_at: string;
  status: 'processing' | 'completed' | 'failed';
}

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [documents, setDocuments] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('rules'); // rules, syllabus, fees, hostel
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalDocs: 0,
    activeCollection: 'college_faq_chunks',
    engineStatus: 'Active (Cosine)',
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setRefreshing(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/documents`);
      setDocuments(res.data);
      setStats((prev) => ({
        ...prev,
        totalDocs: res.data.length,
      }));
    } catch (err: any) {
      console.error('Failed to load documents', err);
      setError('Failed to fetch document catalog from server.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
      setSuccess('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload first.');
      return;
    }

    setError('');
    setSuccess('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      await axios.post(`${API_URL}/api/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(`Successfully ingested "${file.name}"!`);
      setFile(null);
      
      // Reset input element
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Reload document catalog
      fetchDocuments();
    } catch (err: any) {
      console.error('Failed to upload document', err);
      setError(
        err.response?.data?.detail || 'Inflow ingestion failed. Please verify format (PDF/DOCX).'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!window.confirm('Are you sure you want to delete this document and all its text vector points?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/documents/${docId}`);
      setSuccess('Document successfully removed.');
      fetchDocuments();
    } catch (err: any) {
      console.error('Failed to delete document', err);
      setError(err.response?.data?.detail || 'Deletion failed.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Header Banner */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </button>
          <div style={styles.headerTitleRow}>
            <Shield size={24} color="#3b82f6" />
            <h1 style={styles.title}>Admin Panel</h1>
          </div>
        </div>
        <span style={styles.envBadge}>Secure Environment</span>
      </header>

      {/* Grid Dashboard */}
      <div style={styles.grid}>
        {/* Left Side: Stats and Upload */}
        <div style={styles.leftCol}>
          {/* Stats section */}
          <div style={styles.card} className="glass-panel animate-fade-in">
            <h2 style={styles.cardTitle}>
              <BarChart2 size={18} color="#3b82f6" style={{ marginRight: '8px' }} />
              System Metrics
            </h2>
            <div style={styles.statsContainer}>
              <div style={styles.statBox}>
                <span style={styles.statValue}>{stats.totalDocs}</span>
                <span style={styles.statLabel}>Documents Ingested</span>
              </div>
              <div style={styles.statBox}>
                <span style={{ ...styles.statValue, fontSize: '13px', color: '#10b981', fontWeight: '700' }}>Active</span>
                <span style={styles.statLabel}>Qdrant Vector DB</span>
              </div>
              <div style={styles.statBox}>
                <span style={{ ...styles.statValue, fontSize: '13px', color: '#8b5cf6', fontWeight: '700' }}>MiniLM-L6-v2</span>
                <span style={styles.statLabel}>Embedding Model</span>
              </div>
            </div>
          </div>

          {/* Ingestion Panel */}
          <div className="glass-panel animate-fade-in" style={{ ...styles.card, marginTop: '20px' }}>
            <h2 style={styles.cardTitle}>
              <Upload size={18} color="#8b5cf6" style={{ marginRight: '8px' }} />
              Ingest Official Document
            </h2>

            {error && (
              <div style={styles.errorAlert}>
                <AlertTriangle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={styles.successAlert}>
                <CheckCircle2 size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleUpload} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Select Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={styles.select}
                  disabled={uploading}
                >
                  <option value="rules">College Rules & Regulations</option>
                  <option value="syllabus">Syllabus & Course Info</option>
                  <option value="fees">Fee Structure & Deadlines</option>
                  <option value="hostel">Hostel & Mess Guidelines</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Upload File</label>
                <div style={styles.uploadArea}>
                  <FileText size={32} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileChange}
                    style={styles.fileInput}
                    disabled={uploading}
                  />
                  <label htmlFor="file-input" style={styles.fileLabel}>
                    {file ? file.name : 'Choose a file (PDF, DOCX, TXT)'}
                  </label>
                  <span style={styles.uploadLimit}>Max size: 10MB</span>
                </div>
              </div>

              <button type="submit" style={styles.submitBtn} disabled={uploading || !file}>
                {uploading ? (
                  <>
                    <RefreshCw size={18} className="spin" style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                    Chunking & Embedding...
                  </>
                ) : (
                  <>
                    <Database size={18} style={{ marginRight: '8px' }} />
                    Upload & Ingest Vectors
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Document Catalog */}
        <div style={styles.rightCol} className="glass-panel animate-fade-in">
          <div style={styles.catalogHeader}>
            <h2 style={{ ...styles.cardTitle, margin: 0 }}>
              <FileText size={18} color="#10b981" style={{ marginRight: '8px' }} />
              Document Catalog
            </h2>
            <button style={styles.refreshBtn} onClick={fetchDocuments} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          <div style={styles.catalogContainer}>
            {documents.length === 0 ? (
              <div style={styles.emptyCatalog}>
                <Database size={40} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                <span>No documents ingested yet.</span>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Upload college PDF/DOCX files on the left to start populate.
                </p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Filename</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Upload Date</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} style={styles.tr}>
                        <td style={styles.td} title={doc.filename}>
                          <div style={styles.filenameCell}>
                            <FileText size={16} color="#94a3b8" style={{ marginRight: '8px', flexShrink: 0 }} />
                            <span style={styles.filenameText}>{doc.filename}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: getCategoryColor(doc.category),
                          }}>{doc.category}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusDot,
                            backgroundColor: doc.status === 'completed' ? '#10b981' : doc.status === 'failed' ? '#ef4444' : '#f59e0b'
                          }} />
                          <span style={styles.statusText}>{doc.status}</span>
                        </td>
                        <td style={styles.td}>
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <button style={styles.deleteBtn} onClick={() => handleDelete(doc.id)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const getCategoryColor = (cat: string) => {
  switch (cat.toLowerCase()) {
    case 'rules': return 'rgba(59, 130, 246, 0.2)';
    case 'syllabus': return 'rgba(16, 185, 129, 0.2)';
    case 'fees': return 'rgba(245, 158, 11, 0.2)';
    case 'hostel': return 'rgba(139, 92, 246, 0.2)';
    default: return 'rgba(148, 163, 184, 0.2)';
  }
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    padding: '24px 40px',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '30px',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
    letterSpacing: '-0.5px',
    color: '#ffffff',
  },
  envBadge: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    padding: '6px 14px',
    borderRadius: '20px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  grid: {
    display: 'flex',
    gap: '30px',
    flex: 1,
    minHeight: 0,
  },
  leftCol: {
    width: '400px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  card: {
    padding: '28px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
  },
  statsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    padding: '16px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '700',
    fontFamily: 'var(--font-display)',
    color: '#ffffff',
    lineHeight: '1.2',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  select: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
  },
  uploadArea: {
    border: '2px dashed rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    textAlign: 'center',
  },
  fileInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    top: 0,
    left: 0,
  },
  fileLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#3b82f6',
    cursor: 'pointer',
    marginBottom: '4px',
    wordBreak: 'break-all',
    padding: '0 10px',
  },
  uploadLimit: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    marginTop: '6px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#fca5a5',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    color: '#a7f3d0',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px',
  },
  rightCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '28px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  catalogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  refreshBtn: {
    background: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  catalogContainer: {
    flex: 1,
    overflowY: 'auto',
  },
  emptyCatalog: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    padding: '40px 0',
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'var(--transition-smooth)',
  },
  td: {
    padding: '14px 16px',
    fontSize: '13.5px',
    color: '#e2e8f0',
    verticalAlign: 'middle',
  },
  filenameCell: {
    display: 'flex',
    alignItems: 'center',
    maxWidth: '220px',
  },
  filenameText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
    display: 'inline-block',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '6px',
  },
  statusText: {
    fontSize: '12px',
    textTransform: 'capitalize',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--danger)',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-smooth)',
  },
};
