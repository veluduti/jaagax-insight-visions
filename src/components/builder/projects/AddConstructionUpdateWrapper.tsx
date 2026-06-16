import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import AddConstructionUpdate from "./AddConstructionUpdate";

const AddConstructionUpdateWrapper = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get("editId") || undefined;

  if (!id) return null;

  return (
    <AddConstructionUpdate
      projectId={id}
      editId={editId}
      onSuccess={() => navigate(`/builder/projects/${id}`)}
      onCancel={() => navigate(-1)}
    />
  );
};

export default AddConstructionUpdateWrapper;
