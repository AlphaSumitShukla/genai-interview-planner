import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import "../auth.form.scss";
import { useAuth } from "../hooks/useAuth";

const Login = () => {
  const { loading, handleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Read message or prefilled email from registration redirect
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
    }
    if (location.state?.registeredEmail) {
      setEmail(location.state.registeredEmail);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg("");

      await handleLogin(email.trim(), password);
      navigate("/");
    } catch (err) {
      const isNotFound =
        err.response?.status === 404 ||
        err.response?.data?.errorType === "USER_NOT_FOUND" ||
        err.response?.data?.message?.toLowerCase().includes("register");

      if (isNotFound) {
        setShowRegisterModal(true);
      } else {
        setErrorMsg(err.response?.data?.message || "Invalid email or password.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main>
      <div className="form-container">
        <h1>Welcome Back</h1>

        {/* Alert Messages */}
        {errorMsg && (
          <div className="alert-box alert-error" role="alert">
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-box alert-success" role="status">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMsg("");
              }}
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg("");
              }}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            className="button primary-button"
            type="submit"
            disabled={actionLoading || loading}
          >
            {actionLoading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>

      {/* Unregistered User Popup Modal */}
      {showRegisterModal && (
        <div className="register-modal-overlay" role="dialog" aria-modal="true">
          <div className="register-modal-card">
            <div className="modal-icon-badge">⚠️</div>
            <h2>Account Not Found</h2>
            <p>
              We couldn't find an account associated with <strong>{email}</strong>.
              Please create an account first before logging in!
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setShowRegisterModal(false);
                  navigate("/register", { state: { email: email.trim() } });
                }}
              >
                Register Now (Create Account) 🚀
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowRegisterModal(false)}
              >
                Cancel / Try Another Email
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Login;
