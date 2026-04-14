import { useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AddBuilderProfileForm from "@/components/builder/AddBuilderProfileForm";

const EditBuilderProfile = () => {
  const { id } = useParams();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <AddBuilderProfileForm editId={id} />
      <Footer />
    </div>
  );
};

export default EditBuilderProfile;
