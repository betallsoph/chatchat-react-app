import { useEffect, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { auth } from '../firebase';
import googleSignInBtn from '../../signin-assets/Web (mobile + desktop)/svg/light/web_light_rd_SI.svg';
import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';

const Login: FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const validateEmail = () => {
    const newErrors = { email: '' };
    let isValid = true;

    if (!email) {
      newErrors.email = 'Email là bắt buộc';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSendEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    if (!validateEmail()) return;

    try {
      setIsLoading(true);
      const actionCodeSettings = {
        url: window.location.origin + '/',
        handleCodeInApp: true
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setSuccessMessage('Đã gửi link đăng nhập tới email của bạn. Hãy mở email và nhấn vào liên kết để hoàn tất.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi gửi link.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
      try {
      setIsLoading(true);
      setErrorMessage('');
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        setSuccessMessage('Đăng nhập Google thành công!');
          navigate('/chat', { replace: true });
      } catch (popupErr) {
        // Nếu trình duyệt chặn popup hoặc lỗi liên quan popup → fallback sang redirect
        await signInWithRedirect(auth, provider);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập Google thất bại';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Hoàn tất đăng nhập qua email link nếu user mở từ email
  useEffect(() => {
    const completeWithEmailLink = async () => {
      try {
        if (isSignInWithEmailLink(auth, window.location.href)) {
          let storedEmail = window.localStorage.getItem('emailForSignIn') || '';
          if (!storedEmail) {
            // Fallback: yêu cầu người dùng nhập email nếu không có trong localStorage
            storedEmail = window.prompt('Vui lòng nhập email bạn đã dùng để nhận liên kết:') || '';
          }
          if (storedEmail) {
            await signInWithEmailLink(auth, storedEmail, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            setSuccessMessage('Đăng nhập qua email link thành công!');
            navigate('/chat', { replace: true });
          }
        }
        // Xử lý kết quả redirect từ Google (nếu có)
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          setSuccessMessage('Đăng nhập Google thành công!');
          navigate('/chat', { replace: true });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể hoàn tất đăng nhập qua email link';
        setErrorMessage(msg);
      }
    };
    void completeWithEmailLink();
  }, []);

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Chào mừng trở lại</h1>
          <p>Đăng nhập vào tài khoản của bạn</p>
        </div>

        {successMessage && (
          <div className="success-message" role="status" aria-live="polite">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="error-banner" role="alert" aria-live="assertive">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSendEmailLink} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          <div className="form-options" style={{ justifyContent: 'flex-start' }}>
            <span style={{ color: '#666', fontSize: 14 }}>Đăng nhập bằng liên kết gửi qua email (không cần mật khẩu)</span>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner">⏳ Đang gửi liên kết...</span>
            ) : (
              'Gửi liên kết đăng nhập qua email'
            )}
          </button>
        </form>

        <div className="login-divider">
          <span>hoặc</span>
        </div>

        <div className="social-login">
          <button
            className="social-button google"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
            }}
            aria-label="Đăng nhập với Google"
          >
            <img
              src={googleSignInBtn}
              alt="Sign in with Google"
              style={{ height: 40 }}
            />
          </button>
        </div>

        <div className="login-footer">
          <p>Bằng việc tiếp tục, bạn đồng ý với điều khoản sử dụng của chúng tôi.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;