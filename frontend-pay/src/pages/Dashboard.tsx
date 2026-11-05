// src/pages/Dashboard.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ToastContainer, toast } from "react-toastify";

interface Payment {
  id: number;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  phone_number: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orderId, setOrderId] = useState("");
  const [debouncedOrderId, setDebouncedOrderId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [newPayment, setNewPayment] = useState({ order_id: "", amount: "", currency: "INR", phone_number: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Session expired. Please login again.");
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedOrderId(orderId), 500);
    return () => clearTimeout(handler);
  }, [orderId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (debouncedOrderId.trim()) params.order_id = debouncedOrderId.trim();
      if (statusFilter) params.status = statusFilter;
      if (currencyFilter) params.currency = currencyFilter;

      const res = await api.get("/payment", { params });
      setPayments(res.data.payments || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("token");
        navigate("/");
      } else {
        toast.error(err.response?.data?.message || "Failed to fetch payments");
      }
      setPayments([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, debouncedOrderId, statusFilter, currencyFilter]);

  const createPayment = async () => {
    const phoneRegex = /^[0-9]{10,15}$/;
    if (newPayment.phone_number && !phoneRegex.test(newPayment.phone_number)) {
      toast.error("Phone number must be 10–15 digits");
      return;
    }
    if (!newPayment.order_id || !newPayment.amount) {
      toast.error("Order ID and Amount are required");
      return;
    }

    try {
      await api.post("/payment/create", {
        order_id: newPayment.order_id,
        amount: Number(newPayment.amount),
        currency: newPayment.currency,
        phone_number: newPayment.phone_number,
      });
      toast.success("Payment created successfully!");
      setNewPayment({ order_id: "", amount: "", currency: "INR", phone_number: "" });
      fetchPayments();
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("token");
        navigate("/");
      } else {
        toast.error(err.response?.data?.message || "Failed to create payment");
      }
    }
  };

  const cancelPayment = async (id: number) => {
    try {
      await api.delete(`/payment/${id}`);
      toast.info("Payment canceled");
      fetchPayments();
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("token");
        navigate("/");
      } else {
        toast.error(err.response?.data?.message || "Failed to cancel payment");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    toast.info("Logged out successfully");
    navigate("/");
  };

  return (
    <div style={{ maxWidth: 1000, margin: "50px auto", fontFamily: "Arial, sans-serif", padding: "0 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1 style={{ color: "#333" }}>Dashboard</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: 4,
            transition: "background 0.3s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d7372f")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f44336")}
        >
          Logout
        </button>
      </div>

      {/* Create Payment */}
      <div style={{
        display: "flex",
        gap: 10,
        marginBottom: 20,
        flexWrap: "wrap",
        justifyContent: "center",
        backgroundColor: "#f9f9f9",
        padding: 15,
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}>
        <input
          type="text"
          placeholder="Order ID"
          value={newPayment.order_id}
          onChange={(e) => setNewPayment({ ...newPayment, order_id: e.target.value })}
          style={{ padding: 10, flex: "1 1 150px", borderRadius: 4, border: "1px solid #ccc" }}
        />
        <input
          type="number"
          placeholder="Amount"
          value={newPayment.amount}
          onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
          style={{ padding: 10, flex: "1 1 100px", borderRadius: 4, border: "1px solid #ccc" }}
        />
        <input
          type="text"
          placeholder="Phone Number"
          value={newPayment.phone_number}
          onChange={(e) => setNewPayment({ ...newPayment, phone_number: e.target.value })}
          style={{ padding: 10, flex: "1 1 150px", borderRadius: 4, border: "1px solid #ccc" }}
        />
        <select
          value={newPayment.currency}
          onChange={(e) => setNewPayment({ ...newPayment, currency: e.target.value })}
          style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="INR">INR</option>
          <option value="USD">USD</option>
        </select>
        <button
          onClick={createPayment}
          style={{
            padding: 10,
            cursor: "pointer",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 4,
            transition: "background 0.3s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#45a049")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4CAF50")}
        >
          Create
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 20, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by Order ID"
          value={orderId}
          onChange={(e) => { setPage(1); setOrderId(e.target.value); }}
          style={{ padding: 10, flex: "1 1 200px", borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button
          onClick={() => { setOrderId(""); setPage(1); }}
          style={{
            padding: 10,
            cursor: "pointer",
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            borderRadius: 4,
            transition: "background 0.3s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d7372f")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f44336")}
        >
          Clear Search
        </button>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="success">Success</option>
          <option value="canceled">Canceled</option>
        </select>
        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          style={{ padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="">All Currency</option>
          <option value="INR">INR</option>
          <option value="USD">USD</option>
        </select>
      </div>

      {/* Payment Table */}
      <div style={{ overflowX: "auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 20 }}>Loading payments...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#f1f1f1", position: "sticky", top: 0 }}>
              <tr>
                {["Order ID", "Amount", "Currency", "Status", "Created At", "Phone Number", "Action"].map((h) => (
                  <th key={h} style={{ padding: 12, borderBottom: "1px solid #ddd", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #eee", transition: "background 0.3s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fafafa")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}>
                  <td style={{ padding: 10 }}>{p.order_id}</td>
                  <td style={{ padding: 10 }}>{p.amount}</td>
                  <td style={{ padding: 10 }}>{p.currency}</td>
                  <td style={{ padding: 10 }}>{p.status}</td>
                  <td style={{ padding: 10 }}>{new Date(p.created_at).toLocaleString()}</td>
                  <td style={{ padding: 10 }}>
                    {p.phone_number ? (
                      <a href={`/customer/${p.phone_number}`} style={{ textDecoration: "underline", color: "blue" }}>
                        {p.phone_number}
                      </a>
                    ) : "-"}
                  </td>
                  <td style={{ padding: 10 }}>
                    {p.status !== "canceled" && (
                      <button
                        onClick={() => cancelPayment(p.id)}
                        style={{
                          padding: "6px 12px",
                          cursor: "pointer",
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          transition: "background 0.3s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d7372f")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f44336")}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
        <button onClick={() => setPage((prev) => Math.max(prev - 1, 1))} disabled={page === 1} style={{ padding: 8, cursor: "pointer", borderRadius: 4 }}>Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))} disabled={page === totalPages} style={{ padding: 8, cursor: "pointer", borderRadius: 4 }}>Next</button>
      </div>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ fontSize: "14px", minWidth: "250px", zIndex: 9999 }}
        toastStyle={{ borderRadius: "8px", padding: "12px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}
      />
    </div>
  );
};

export default Dashboard;
