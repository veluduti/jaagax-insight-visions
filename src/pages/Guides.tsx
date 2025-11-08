import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  TrendingUp,
  Home,
  FileText,
  Calculator,
  Shield,
  Clock,
} from "lucide-react";

const guides = [
  {
    title: "Complete Guide to Buying Property in Hyderabad",
    category: "Buying Guide",
    readTime: "10 min read",
    icon: Home,
    description:
      "Everything you need to know about purchasing property in Hyderabad, from documentation to registration.",
    tags: ["Buying", "Legal", "Documentation"],
  },
  {
    title: "Understanding RERA Regulations in Telangana & AP",
    category: "Legal",
    readTime: "8 min read",
    icon: Shield,
    description:
      "Learn about RERA compliance, buyer rights, and how to verify project registrations.",
    tags: ["RERA", "Legal", "Compliance"],
  },
  {
    title: "Top 10 Localities in Vijayawada for Investment",
    category: "Market Insights",
    readTime: "12 min read",
    icon: TrendingUp,
    description:
      "Discover the best areas in Vijayawada for property investment with growth potential analysis.",
    tags: ["Investment", "Vijayawada", "Market"],
  },
  {
    title: "Home Loan Process: Complete Step-by-Step Guide",
    category: "Finance",
    readTime: "15 min read",
    icon: Calculator,
    description:
      "Comprehensive guide to securing home loans, eligibility criteria, and documentation required.",
    tags: ["Loans", "Finance", "Banking"],
  },
  {
    title: "Property Registration Process in Telangana",
    category: "Legal",
    readTime: "9 min read",
    icon: FileText,
    description:
      "Detailed walkthrough of the property registration process, fees, and required documents.",
    tags: ["Registration", "Legal", "Process"],
  },
  {
    title: "Real Estate Market Trends 2024: Hyderabad",
    category: "Market Analysis",
    readTime: "7 min read",
    icon: TrendingUp,
    description:
      "Analysis of current market trends, price movements, and future projections for Hyderabad.",
    tags: ["Trends", "Market", "2024"],
  },
];

const Guides = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Knowledge Hub</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Guides & Resources
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Expert insights and comprehensive guides for navigating the real
              estate market in Hyderabad and Vijayawada
            </p>
          </motion.div>

          {/* Featured Guide */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <Card className="glass-panel overflow-hidden">
              <div className="grid md:grid-cols-2 gap-6">
                <div
                  className="h-64 md:h-auto bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url(https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800)",
                  }}
                />
                <div className="p-8 flex flex-col justify-center">
                  <Badge className="w-fit mb-4">Featured Guide</Badge>
                  <h2 className="text-3xl font-bold mb-4">
                    First-Time Home Buyer's Guide to Hyderabad
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    A comprehensive guide covering everything from property
                    search to possession, specifically tailored for first-time
                    buyers in Hyderabad's real estate market.
                  </p>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">20 min read</span>
                    </div>
                    <Badge variant="secondary">Comprehensive</Badge>
                  </div>
                  <Button className="w-fit">Read Full Guide</Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Guides Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide, idx) => {
              const Icon = guide.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.05 }}
                >
                  <Card className="glass-panel p-6 hover:scale-105 transition-all duration-300 group cursor-pointer h-full flex flex-col">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-2">
                          {guide.category}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{guide.readTime}</span>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors">
                      {guide.title}
                    </h3>

                    <p className="text-sm text-muted-foreground mb-4 flex-1">
                      {guide.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {guide.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <Button variant="outline" className="w-full">
                      Read Article
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Newsletter Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-16"
          >
            <Card className="glass-panel p-8 text-center">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                Stay Updated with Market Insights
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Subscribe to our newsletter for weekly market updates, new
                guides, and exclusive real estate tips
              </p>
              <div className="flex gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background"
                />
                <Button>Subscribe</Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Guides;
