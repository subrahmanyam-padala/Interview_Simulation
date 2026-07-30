import { useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function VerifyEmailPage() {
  const navigate = useNavigate();

  useLayoutEffect(() => {
    navigate('/register', { replace: true });
  }, [navigate]);

  return null;
}

export default VerifyEmailPage;
