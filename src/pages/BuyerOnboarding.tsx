import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BuyerOnboarding = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard/buyer", { replace: true });
  }, [navigate]);

  return null;
};

export default BuyerOnboarding;
