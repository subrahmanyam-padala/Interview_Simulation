import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { uploadResume, getMyResumes } from '../api/resumeApi';

function ResumeUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resumes, setResumes] = useState([]);

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      const data = await getMyResumes();
      setResumes(data.resumes);
    } catch (err) {
      console.error('Failed to load resumes', err);
    }
  };

  const onFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
  };

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await uploadResume(file);
      setFile(null);
      await loadResumes();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload resume. Ensure it is PDF or DOCX.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="AI Resume Analyzer" subtitle="Upload your resume to generate personalized interview questions.">
      <section className="glass-card p-6 max-w-3xl mb-8">
        <h2 className="text-xl font-semibold mb-4 text-white">Upload New Resume</h2>
        <form onSubmit={onUpload} className="flex flex-col gap-4">
          <input 
            type="file" 
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
            onChange={onFileChange} 
            className="text-slate-300"
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button 
            type="submit" 
            className="primary-btn flex items-center justify-center gap-2" 
            disabled={loading || !file}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : 'Upload & Analyze'}
          </button>
        </form>
      </section>

      <section className="glass-card p-6 max-w-3xl">
        <h2 className="text-xl font-semibold mb-4 text-white">My Resumes</h2>
        {resumes.length === 0 ? (
          <p className="text-slate-400">No resumes uploaded yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {resumes.map((resume) => (
              <div key={resume._id} className="p-4 border border-slate-700 rounded-lg bg-slate-800/50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-white">{resume.fileName}</h3>
                  <button 
                    onClick={() => navigate('/setup', { state: { resumeId: resume._id } })}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Start Interview
                  </button>
                </div>
                <div className="text-sm text-slate-300">
                  <p><strong className="text-slate-200">Skills:</strong> {resume.parsedData?.skills?.slice(0, 10).join(', ')}...</p>
                  <p><strong className="text-slate-200">Experience:</strong> {resume.parsedData?.experience?.length || 0} roles</p>
                  <p><strong className="text-slate-200">Projects:</strong> {resume.parsedData?.projects?.length || 0}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default ResumeUploadPage;
