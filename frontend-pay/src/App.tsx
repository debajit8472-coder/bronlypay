// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CustomerDetails from "./pages/CustomerDetails"; // ✅ import the new page

function App() {
  return (
    <Router future={{ v7_startTransition: true }}> {/* ✅ future flag added here */}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customer/:phoneNumber" element={<CustomerDetails />} /> {/* ✅ new route */}
      </Routes>
    </Router>
  );
}

export default App;
