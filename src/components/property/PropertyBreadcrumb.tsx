import { useNavigate } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface PropertyBreadcrumbProps {
  city: string;
  locality: string;
  title: string;
}

const PropertyBreadcrumb = ({ city, locality, title }: PropertyBreadcrumbProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <button
        onClick={() => navigate("/")}
        className="hover:text-foreground transition-colors flex items-center gap-1"
      >
        <Home className="h-4 w-4" />
        Home
      </button>
      <ChevronRight className="h-4 w-4" />
      <button
        onClick={() => navigate("/map", { state: { city } })}
        className="hover:text-foreground transition-colors"
      >
        {city}
      </button>
      <ChevronRight className="h-4 w-4" />
      <button
        onClick={() => navigate("/map", { state: { city, locality } })}
        className="hover:text-foreground transition-colors"
      >
        {locality}
      </button>
      <ChevronRight className="h-4 w-4" />
      <span className="text-foreground truncate max-w-[200px]">{title}</span>
    </div>
  );
};

export default PropertyBreadcrumb;
