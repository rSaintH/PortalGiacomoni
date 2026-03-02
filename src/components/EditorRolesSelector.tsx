import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Shield } from "lucide-react";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "colaborador", label: "Colaborador" },
];

interface Props {
  value: string[];
  onChange: (roles: string[]) => void;
}

export default function EditorRolesSelector({ value, onChange }: Props) {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  const toggle = (role: string) => {
    if (value.includes(role)) {
      // Don't allow removing all roles
      if (value.length <= 1) return;
      onChange(value.filter((r) => r !== role));
    } else {
      onChange([...value, role]);
    }
  };

  return (
    <div className="space-y-2 border-t pt-4">
      <Label className="text-sm font-medium flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5" />
        Quem pode editar
      </Label>
      <div className="flex gap-4">
        {ROLES.map((role) => (
          <label
            key={role.value}
            className="flex items-center gap-2 cursor-pointer text-sm"
          >
            <Checkbox
              checked={value.includes(role.value)}
              onCheckedChange={() => toggle(role.value)}
            />
            {role.label}
          </label>
        ))}
      </div>
    </div>
  );
}
