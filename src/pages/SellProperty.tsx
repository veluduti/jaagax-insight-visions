import { useState } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Home, DollarSign, MapPin, Phone, Mail, User, Building2, FileText, Check } from "lucide-react";

export default function SellProperty() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    propertyType: "",
    transactionType: "sale",
    city: "",
    locality: "",
    price: "",
    area: "",
    bhk: "",
    title: "",
    description: "",
    name: "",
    email: "",
    phone: "",
  });

  const [images, setImages] = useState<File[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages([...images, ...Array.from(e.target.files)]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.propertyType || !formData.city || !formData.locality || !formData.name || !formData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Listing Submitted!",
      description: "Our team will review your property and contact you within 24 hours.",
    });
    
    console.log("Form submitted:", formData);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              List Your Property with{" "}
              <span className="text-gradient">JaagaX</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with thousands of verified buyers and get the best deal for your property
            </p>
          </motion.div>

          {/* Benefits Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Get Best Price</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Our AI-powered valuation ensures you get the market's best price
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Verified Buyers</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect only with serious, pre-verified buyers
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Quick Sale</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  List for free and close deals 40% faster than competitors
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="max-w-4xl mx-auto">
              <CardContent className="pt-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Property Details Section */}
                  <div>
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                      <Home className="h-6 w-6 text-primary" />
                      Property Details
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="propertyType">Property Type *</Label>
                        <Select
                          value={formData.propertyType}
                          onValueChange={(value) => setFormData({ ...formData, propertyType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apartment">Apartment</SelectItem>
                            <SelectItem value="villa">Villa</SelectItem>
                            <SelectItem value="townhouse">Townhouse</SelectItem>
                            <SelectItem value="penthouse">Penthouse</SelectItem>
                            <SelectItem value="land">Land/Plot</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="transactionType">Listing Type *</Label>
                        <Select
                          value={formData.transactionType}
                          onValueChange={(value) => setFormData({ ...formData, transactionType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sale">For Sale</SelectItem>
                            <SelectItem value="rent">For Rent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Select
                          value={formData.city}
                          onValueChange={(value) => setFormData({ ...formData, city: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mumbai">Mumbai</SelectItem>
                            <SelectItem value="Delhi">Delhi</SelectItem>
                            <SelectItem value="Bangalore">Bangalore</SelectItem>
                            <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                            <SelectItem value="Chennai">Chennai</SelectItem>
                            <SelectItem value="Pune">Pune</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="locality">Locality *</Label>
                        <Input
                          id="locality"
                          placeholder="Enter locality"
                          value={formData.locality}
                          onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="bhk">BHK Configuration</Label>
                        <Select
                          value={formData.bhk}
                          onValueChange={(value) => setFormData({ ...formData, bhk: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select BHK" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 BHK</SelectItem>
                            <SelectItem value="2">2 BHK</SelectItem>
                            <SelectItem value="3">3 BHK</SelectItem>
                            <SelectItem value="4">4 BHK</SelectItem>
                            <SelectItem value="5">5+ BHK</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="area">Area (sq.ft)</Label>
                        <Input
                          id="area"
                          type="number"
                          placeholder="Enter area"
                          value={formData.area}
                          onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="price">
                          {formData.transactionType === "rent" ? "Rent per month (₹)" : "Price (₹)"}
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="Enter price"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="title">Property Title</Label>
                        <Input
                          id="title"
                          placeholder="e.g., Spacious 3BHK with Sea View"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe your property, amenities, unique features..."
                          rows={5}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Images Section */}
                  <div>
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                      <Upload className="h-6 w-6 text-primary" />
                      Property Images
                    </h2>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        Upload high-quality images of your property (Max 10 images)
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="max-w-xs mx-auto"
                      />
                      {images.length > 0 && (
                        <p className="mt-4 text-sm text-primary">
                          {images.length} image(s) selected
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact Details Section */}
                  <div>
                    <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                      <User className="h-6 w-6 text-primary" />
                      Contact Details
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="Enter your name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+91 XXXXX XXXXX"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t">
                    <Button type="submit" size="lg" className="w-full md:w-auto px-12">
                      Submit Property Listing
                    </Button>
                    <p className="text-sm text-muted-foreground mt-4">
                      By submitting, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-16"
          >
            <h2 className="text-3xl font-bold text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Is listing my property free?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes! Listing your property on JaagaX is completely free. No hidden charges.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">How long does verification take?</h3>
                  <p className="text-sm text-muted-foreground">
                    Our team typically reviews and verifies listings within 24-48 hours.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Can I edit my listing later?</h3>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can update your property details, images, and price anytime.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Who will contact me?</h3>
                  <p className="text-sm text-muted-foreground">
                    Only verified buyers and agents on our platform will be able to reach you.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
