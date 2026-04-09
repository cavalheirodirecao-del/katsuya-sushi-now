import { Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  BusinessHours,
  DaySchedule,
  DAY_KEYS,
  DAY_LABELS,
  TimeSlot,
} from "@/hooks/useCompanySettings";

interface Props {
  value: BusinessHours;
  onChange: (v: BusinessHours) => void;
}

const emptyDay: DaySchedule = { active: false, slots: [] };

const BusinessHoursEditor = ({ value, onChange }: Props) => {
  const getDay = (key: string): DaySchedule => value[key] || { ...emptyDay };

  const setDay = (key: string, day: DaySchedule) => {
    onChange({ ...value, [key]: day });
  };

  const toggleDay = (key: string) => {
    const d = getDay(key);
    setDay(key, {
      ...d,
      active: !d.active,
      slots: !d.active && d.slots.length === 0 ? [{ start: "18:00", end: "23:00" }] : d.slots,
    });
  };

  const updateSlot = (key: string, idx: number, field: keyof TimeSlot, val: string) => {
    const d = getDay(key);
    const slots = [...d.slots];
    slots[idx] = { ...slots[idx], [field]: val };
    setDay(key, { ...d, slots });
  };

  const addSlot = (key: string) => {
    const d = getDay(key);
    setDay(key, { ...d, slots: [...d.slots, { start: "12:00", end: "14:00" }] });
  };

  const removeSlot = (key: string, idx: number) => {
    const d = getDay(key);
    setDay(key, { ...d, slots: d.slots.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {DAY_KEYS.map((key) => {
        const day = getDay(key);
        return (
          <div key={key} className="bg-secondary/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium text-sm">{DAY_LABELS[key]}</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {day.active ? "Aberto" : "Fechado"}
                </span>
                <Switch checked={day.active} onCheckedChange={() => toggleDay(key)} />
              </div>
            </div>

            {day.active && (
              <div className="space-y-2 pl-1">
                {day.slots.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.start}
                      onChange={(e) => updateSlot(key, idx, "start", e.target.value)}
                      className="flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                    <span className="text-muted-foreground text-xs">até</span>
                    <input
                      type="time"
                      value={slot.end}
                      onChange={(e) => updateSlot(key, idx, "end", e.target.value)}
                      className="flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(key, idx)}
                      className="text-destructive hover:text-destructive/80 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => addSlot(key)}
                >
                  <Plus className="h-3 w-3" /> Adicionar horário
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BusinessHoursEditor;
