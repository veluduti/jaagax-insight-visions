import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Building2, Home, Briefcase, Plus, X, Sparkles,
  Calendar, DollarSign, Eye, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateAdFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CreateAdForm = ({ onSuccess, onCancel }: CreateAdFormProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    ad_type: 'property' as 'property' | 'project' | 'builder_brand',
    property_id: null as number | null,
    project_id: null as number | null,
    title: '',
    tagline: '',
    description: '',
    images: [] as string[],
    highlights: [] as string[],
    offer_text: '',
    cta_text: 'Learn More',
    start_date: '',
    end_date: '',
    budget: 0,
    featured: false,
  });

  const [newHighlight, setNewHighlight] = useState('');

  useEffect(() => {
    fetchBuilderAssets();
  }, []);

  const fetchBuilderAssets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [propsResult, projsResult] = await Promise.all([
      supabase.from('properties').select('id, title, locality, city, price').eq('submitted_by', user.id),
      supabase.from('projects').select('id, name, locality, city, avg_price').eq('submitted_by', user.id)
    ]);

    setProperties(propsResult.data || []);
    setProjects(projsResult.data || []);
  };

  const addHighlight = () => {
    if (newHighlight.trim() && formData.highlights.length < 5) {
      setFormData(prev => ({
        ...prev,
        highlights: [...prev.highlights, newHighlight.trim()]
      }));
      setNewHighlight('');
    }
  };

  const removeHighlight = (index: number) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to create advertisements");
        return;
      }

      const { error } = await supabase.from('advertisements').insert({
        builder_id: user.id,
        ad_type: formData.ad_type,
        property_id: formData.property_id,
        project_id: formData.project_id,
        title: formData.title,
        tagline: formData.tagline || null,
        description: formData.description || null,
        images: formData.images.length > 0 ? formData.images : null,
        highlights: formData.highlights,
        offer_text: formData.offer_text || null,
        cta_text: formData.cta_text,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget,
        featured: formData.featured,
        status: 'pending_approval'
      });

      if (error) throw error;

      toast.success("Advertisement submitted for approval!");
      onSuccess?.();
    } catch (error: any) {
      console.error('Create ad error:', error);
      toast.error(error.message || "Failed to create advertisement");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">What do you want to promote?</h3>
              <p className="text-sm text-muted-foreground">Choose the type of advertisement</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'property', label: 'Property', icon: Home, desc: 'Promote a specific property' },
                { value: 'project', label: 'Project', icon: Building2, desc: 'Promote an entire project' },
                { value: 'builder_brand', label: 'Brand', icon: Briefcase, desc: 'Promote your brand' },
              ].map((option) => (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-all ${
                    formData.ad_type === option.value 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, ad_type: option.value as any }))}
                >
                  <CardContent className="p-6 text-center">
                    <option.icon className={`h-10 w-10 mx-auto mb-3 ${
                      formData.ad_type === option.value ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <h4 className="font-semibold">{option.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{option.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Select {formData.ad_type === 'property' ? 'Property' : 'Project'}</h3>
              <p className="text-sm text-muted-foreground">Choose what to promote</p>
            </div>

            {formData.ad_type === 'property' ? (
              <Select 
                value={formData.property_id?.toString() || ''} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, property_id: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id.toString()}>
                      {prop.title} - {prop.locality}, {prop.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : formData.ad_type === 'project' ? (
              <Select 
                value={formData.project_id?.toString() || ''} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id.toString()}>
                      {proj.name} - {proj.locality}, {proj.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-center text-muted-foreground">
                Brand promotion doesn't require selecting a specific property or project.
              </p>
            )}
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Create Your Ad Content</h3>
              <p className="text-sm text-muted-foreground">Make it catchy and compelling</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Headline *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Luxury 3BHK at Unbeatable Price!"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g., Your Dream Home Awaits"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="offer">Special Offer</Label>
                <Input
                  id="offer"
                  value={formData.offer_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, offer_text: e.target.value }))}
                  placeholder="e.g., 10% Off This Week Only!"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what makes this special..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label>Key Highlights (up to 5)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    placeholder="e.g., Swimming Pool"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
                  />
                  <Button type="button" onClick={addHighlight} disabled={formData.highlights.length >= 5}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.highlights.map((h, i) => (
                    <Badge key={i} variant="secondary" className="pr-1">
                      {h}
                      <button onClick={() => removeHighlight(i)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="cta">Call to Action Text</Label>
                <Input
                  id="cta"
                  value={formData.cta_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, cta_text: e.target.value }))}
                  placeholder="e.g., Book Site Visit"
                  className="mt-1"
                />
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Schedule & Budget</h3>
              <p className="text-sm text-muted-foreground">Set when your ad runs</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="budget">Budget (₹)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                placeholder="Optional budget"
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <h4 className="font-medium">Featured Listing</h4>
                <p className="text-sm text-muted-foreground">Get priority placement</p>
              </div>
              <Switch
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
              />
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Preview Your Ad</h3>
              <p className="text-sm text-muted-foreground">Review before submitting</p>
            </div>

            <Card className="overflow-hidden">
              <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5">
                <div className="absolute bottom-4 left-4 right-4">
                  {formData.offer_text && (
                    <Badge className="bg-red-500 text-white mb-2">{formData.offer_text}</Badge>
                  )}
                  <h3 className="text-xl font-bold text-foreground">{formData.title || "Your Headline"}</h3>
                </div>
              </div>
              <CardContent className="p-4">
                {formData.tagline && (
                  <p className="text-primary font-medium flex items-center gap-1 mb-2">
                    <Sparkles className="h-3 w-3" />
                    {formData.tagline}
                  </p>
                )}
                {formData.description && (
                  <p className="text-sm text-muted-foreground mb-3">{formData.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {formData.highlights.map((h, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                      {h}
                    </Badge>
                  ))}
                </div>
                <Button className="w-full">{formData.cta_text || "Learn More"}</Button>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formData.start_date || "No start date"} - {formData.end_date || "No end date"}
              </span>
              {formData.featured && (
                <Badge className="bg-amber-500">Featured</Badge>
              )}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Create New Advertisement
        </CardTitle>
        <CardDescription>
          Step {step} of 5
        </CardDescription>
        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 5) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onCancel?.()}
          >
            {step > 1 ? "Previous" : "Cancel"}
          </Button>
          
          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !formData.ad_type || step === 3 && !formData.title}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {loading ? "Submitting..." : "Submit for Approval"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CreateAdForm;