import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, Upload, Download, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export const DataImportPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [importSource, setImportSource] = useState<"apify" | "manual">("manual");
  const [apifyApiKey, setApifyApiKey] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>(["Hyderabad", "Vijayawada"]);
  const [jsonData, setJsonData] = useState("");

  const handleCityToggle = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city)
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const handleImport = async () => {
    if (importSource === "apify" && !apifyApiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your Apify API key",
        variant: "destructive"
      });
      return;
    }

    if (importSource === "manual" && !jsonData) {
      toast({
        title: "Data Required",
        description: "Please paste your JSON data",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      let payload: any = { source: importSource };

      if (importSource === "apify") {
        payload.cities = selectedCities;
        payload.apifyApiKey = apifyApiKey;
      } else {
        const data = JSON.parse(jsonData);
        payload = { ...payload, ...data };
      }

      const { data: result, error } = await supabase.functions.invoke('import-real-estate-data', {
        body: payload
      });

      if (error) throw error;

      toast({
        title: "Import Successful",
        description: `Imported ${result.properties} properties, ${result.agents} agents, and ${result.builders} builders`,
      });

      if (result.errors && result.errors.length > 0) {
        console.error("Import errors:", result.errors);
        toast({
          title: "Some Errors Occurred",
          description: `${result.errors.length} errors during import. Check console.`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sampleData = {
    properties: [
      {
        title: "3 BHK Luxury Apartment in Banjara Hills",
        city: "Hyderabad",
        locality: "Banjara Hills",
        price: 12500000,
        area: 1850,
        type: "Apartment",
        beds: 3,
        baths: 3,
        bhk: 3,
        images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00"],
        description: "Spacious 3 BHK with modern amenities",
        status: "Ready",
        verified: false,
        trust_score: 75
      }
    ],
    agents: [
      {
        name: "John Doe",
        agency_name: "Premium Realty",
        cities_served: "Hyderabad",
        languages: "English, Hindi, Telugu",
        sales_count: 0,
        rent_count: 0,
        trust_score: 75,
        verified: false
      }
    ],
    builders: [
      {
        name: "ABC Constructions",
        city: "Hyderabad",
        description: "Leading builder in Hyderabad",
        trust_score: 80,
        verified: false
      }
    ]
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Real-Time Data Import
        </CardTitle>
        <CardDescription>
          Import real property data from Hyderabad and Vijayawada using Apify scrapers or manual JSON upload
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Import Source</Label>
          <Select value={importSource} onValueChange={(val: any) => setImportSource(val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apify">Apify Scrapers (99acres, MagicBricks)</SelectItem>
              <SelectItem value="manual">Manual JSON Upload</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {importSource === "apify" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="apifyKey">
                Apify API Key
                <a 
                  href="https://console.apify.com/account/integrations" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-primary hover:underline"
                >
                  Get API Key →
                </a>
              </Label>
              <Input
                id="apifyKey"
                type="password"
                placeholder="Enter your Apify API key"
                value={apifyApiKey}
                onChange={(e) => setApifyApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Apify provides scrapers for 99acres, MagicBricks, and Housing.com (~$15-20/month)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Select Cities</Label>
              <div className="flex gap-4">
                {["Hyderabad", "Vijayawada"].map((city) => (
                  <div key={city} className="flex items-center space-x-2">
                    <Checkbox
                      id={city}
                      checked={selectedCities.includes(city)}
                      onCheckedChange={() => handleCityToggle(city)}
                    />
                    <label htmlFor={city} className="text-sm cursor-pointer">
                      {city}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {importSource === "manual" && (
          <div className="space-y-2">
            <Label htmlFor="jsonData">JSON Data</Label>
            <Textarea
              id="jsonData"
              placeholder={JSON.stringify(sampleData, null, 2)}
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              className="font-mono text-xs h-64"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setJsonData(JSON.stringify(sampleData, null, 2))}
            >
              <Download className="w-4 h-4 mr-2" />
              Load Sample Data
            </Button>
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing Data...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Import Real Estate Data
            </>
          )}
        </Button>

        <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
          <h4 className="font-semibold">Import Instructions:</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>Apify Method:</strong> Get API key from Apify, select cities, and import</li>
            <li><strong>Manual Method:</strong> Paste JSON with properties, agents, and builders</li>
            <li>Imported data will be marked as unverified (trust_score: 75)</li>
            <li>Review and verify data in the Verification Panel</li>
            <li>Remove fake/unwanted listings manually after import</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
