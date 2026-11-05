import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api"; // Axios instance

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    console.log("Sending login request:", { email, password });

    try {
      const res = await api.post("/auth/login", { email, password });

      console.log("Login success:", res.data);

      // Save token in localStorage
      localStorage.setItem("token", res.data.token);

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", textAlign: "center" }}>
      <h1>Login</h1>
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 10 }}
        />
        <button type="submit" style={{ padding: 10, cursor: "pointer" }}>
          Login
        </button>
      </form>
      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
    </div>
  );
};

export default Login;
