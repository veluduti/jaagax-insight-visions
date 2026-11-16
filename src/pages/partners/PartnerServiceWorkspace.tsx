import { useParams } from "react-router-dom";
import PartnerExtraServices from "./PartnerExtraServices";
import PartnerSetupEditor from "./PartnerSetupEditor";

export default function PartnerServiceWorkspace() {
  const {section}=useParams();
  return section && ["dining","events","experiences","services"].includes(section)
    ? <PartnerExtraServices group={section}/>
    : <PartnerSetupEditor/>;
}