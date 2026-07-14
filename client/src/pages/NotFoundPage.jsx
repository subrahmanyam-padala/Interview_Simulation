import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-card p-8 text-center">
        <h1 className="font-display text-5xl text-white">404</h1>
        <p className="mt-2 text-slate-300">Page not found.</p>
        <Link to="/" className="primary-btn mt-5 inline-flex">
          Go Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
