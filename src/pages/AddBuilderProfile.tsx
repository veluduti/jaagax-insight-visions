import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AddBuilderProfileForm from "@/components/builder/AddBuilderProfileForm";

const AddBuilderProfile = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <AddBuilderProfileForm />
      <Footer />
    </div>
  );
};

export default AddBuilderProfile;
