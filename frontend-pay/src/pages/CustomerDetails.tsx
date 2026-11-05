// src/pages/CustomerDetails.tsx
import { useParams } from "react-router-dom";

const CustomerDetails = () => {
  const { phoneNumber } = useParams<{ phoneNumber: string }>();

  return (
    <div style={{ padding: "20px" }}>
      <h1>Customer Details</h1>
      <p>Phone Number: {phoneNumber}</p>
    </div>
  );
};

export default CustomerDetails; // ✅ This default export is required!
