import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ArrayInputFieldProps {
  label: string;
  placeholder: string;
  inputValue: string;
  items: string[];
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

/**
 * Stable input field for adding string items to an array.
 * MUST live outside the parent form component to keep input focus
 * across keystrokes (otherwise React unmounts/remounts the input on every render).
 */
const ArrayInputField = ({
  label,
  placeholder,
  inputValue,
  items,
  onInputChange,
  onAdd,
  onRemove,
}: ArrayInputFieldProps) => {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={onAdd}>
          Add
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {items.map((item, i) => (
            <Badge key={`${item}-${i}`} variant="secondary" className="gap-1">
              {item}
              <X className="h-3 w-3 cursor-pointer" onClick={() => onRemove(i)} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArrayInputField;
