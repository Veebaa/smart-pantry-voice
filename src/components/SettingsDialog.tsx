import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const dietaryOptions = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
  "nut-free",
  "low-carb",
  "keto"
];

const languageOptions = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
];

const accentOptions: Record<string, { value: string; label: string }[]> = {
  en: [
    { value: "en-US", label: "American" },
    { value: "en-GB", label: "British" },
    { value: "en-IE", label: "Irish" },
    { value: "en-AU", label: "Australian" },
  ],
  es: [{ value: "es", label: "Standard Spanish" }],
  fr: [{ value: "fr", label: "Standard French" }],
  de: [{ value: "de", label: "Standard German" }],
  it: [{ value: "it", label: "Standard Italian" }],
  pt: [{ value: "pt", label: "Standard Portuguese" }],
};

export const SettingsDialog = () => {
  const [open, setOpen] = useState(false);
  const [householdSize, setHouseholdSize] = useState(2);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [voiceLanguage, setVoiceLanguage] = useState("en");
  const [voiceAccent, setVoiceAccent] = useState("en-US");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setHouseholdSize(data.household_size || 2);
        setSelectedDiets(data.dietary_restrictions || []);
        setVoiceLanguage(data.voice_language || "en");
        setVoiceAccent(data.voice_accent || "en-US");
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          household_size: householdSize,
          dietary_restrictions: selectedDiets,
          voice_language: voiceLanguage,
          voice_accent: voiceAccent,
        });

      if (error) throw error;

      toast.success("Settings saved successfully!");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDiet = (diet: string) => {
    setSelectedDiets(prev =>
      prev.includes(diet)
        ? prev.filter(d => d !== diet)
        : [...prev, diet]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Household Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="household-size">Household Size</Label>
            <Input
              id="household-size"
              type="number"
              min={1}
              max={20}
              value={householdSize}
              onChange={(e) => setHouseholdSize(parseInt(e.target.value) || 2)}
            />
            <p className="text-sm text-muted-foreground">
              Number of people you're cooking for
            </p>
          </div>

          <div className="space-y-3">
            <Label>Dietary Restrictions</Label>
            <div className="space-y-2">
              {dietaryOptions.map((diet) => (
                <div key={diet} className="flex items-center space-x-2">
                  <Checkbox
                    id={diet}
                    checked={selectedDiets.includes(diet)}
                    onCheckedChange={() => toggleDiet(diet)}
                  />
                  <label
                    htmlFor={diet}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                  >
                    {diet}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Voice Settings</Label>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="voice-language">Language</Label>
                <Select value={voiceLanguage} onValueChange={(value) => {
                  setVoiceLanguage(value);
                  // Reset accent to first option for selected language
                  const firstAccent = accentOptions[value]?.[0]?.value || value;
                  setVoiceAccent(firstAccent);
                }}>
                  <SelectTrigger id="voice-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="voice-accent">Accent</Label>
                <Select value={voiceAccent} onValueChange={setVoiceAccent}>
                  <SelectTrigger id="voice-accent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accentOptions[voiceLanguage]?.map((accent) => (
                      <SelectItem key={accent.value} value={accent.value}>
                        {accent.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button
            onClick={saveSettings}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
