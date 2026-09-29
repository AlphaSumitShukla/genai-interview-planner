import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import { useAuth } from "../hooks/useAuth";
import "../auth.form.scss";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, handleRegister } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Pre-fill email if passed from login popup
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setErrorMsg("All fields are required.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg("");

      await handleRegister({
        username: username.trim(),
        email: email.trim(),
        password,
      });

      // Redirect user to login page with pre-filled email and success message
      navigate("/login", {
        state: {
          message: "Account created successfully! Please sign in to continue.",
          registeredEmail: email.trim(),
        },
      });
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main>
      <div className="form-container">
        <h1>Create Account</h1>

        {errorMsg && (
          <div className="alert-box alert-error" role="alert">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrorMsg("");
              }}
              placeholder="Choose a username"
              autoComplete="username"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
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
              name="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg("");
              }}
              placeholder="Create a password (min. 6 characters)"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            className="button primary-button"
            type="submit"
            disabled={actionLoading || loading}
          >
            {actionLoading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </main>
  );
};

export default Register;