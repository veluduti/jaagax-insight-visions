import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Building2,
  Sparkles,
} from "lucide-react";

const events = [
  {
    title: "Hyderabad Property Expo 2024",
    date: "June 15-17, 2024",
    time: "10:00 AM - 6:00 PM",
    location: "Hitex Exhibition Centre, Hyderabad",
    type: "Expo",
    attendees: "5000+",
    status: "Upcoming",
    description:
      "India's largest property exhibition featuring 100+ developers, exclusive launch offers, and expert seminars.",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
  },
  {
    title: "First-Time Home Buyers Workshop",
    date: "May 28, 2024",
    time: "2:00 PM - 5:00 PM",
    location: "JaagaX Office, Banjara Hills",
    type: "Workshop",
    attendees: "50",
    status: "Registration Open",
    description:
      "Learn everything about home loans, legal processes, and smart property selection. Free consultation included.",
    image: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800",
  },
  {
    title: "Real Estate Investment Seminar - Vijayawada",
    date: "June 5, 2024",
    time: "11:00 AM - 2:00 PM",
    location: "Fortune Murali Park, Vijayawada",
    type: "Seminar",
    attendees: "200",
    status: "Registration Open",
    description:
      "Expert insights on investment opportunities in Vijayawada's growing real estate market.",
    image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800",
  },
  {
    title: "Luxury Villas Showcase",
    date: "June 10, 2024",
    time: "11:00 AM - 6:00 PM",
    location: "Jubilee Hills, Hyderabad",
    type: "Site Visit",
    attendees: "100",
    status: "Limited Seats",
    description:
      "Exclusive preview of premium villa projects with special pre-launch pricing and site tours.",
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800",
  },
  {
    title: "RERA Compliance Workshop for Builders",
    date: "June 20, 2024",
    time: "9:00 AM - 1:00 PM",
    location: "Virtual Event",
    type: "Online Workshop",
    attendees: "Unlimited",
    status: "Free Event",
    description:
      "Comprehensive workshop on RERA regulations, compliance requirements, and best practices.",
    image: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800",
  },
  {
    title: "Smart Home Technology Expo",
    date: "June 25, 2024",
    time: "10:00 AM - 7:00 PM",
    location: "Inorbit Mall, Hyderabad",
    type: "Expo",
    attendees: "2000+",
    status: "Upcoming",
    description:
      "Explore the latest in home automation, security systems, and sustainable living solutions.",
    image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800",
  },
];

const Events = () => {
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
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Events & Workshops</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Real Estate Events
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect, learn, and explore opportunities at our curated events in
              Hyderabad and Vijayawada
            </p>
          </motion.div>

          {/* Featured Event */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <Card className="glass-panel overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div
                  className="h-64 md:h-auto bg-cover bg-center relative"
                  style={{
                    backgroundImage: `url(${events[0].image})`,
                  }}
                >
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-primary">Featured Event</Badge>
                  </div>
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline">{events[0].type}</Badge>
                    <Badge className="bg-green-500">{events[0].status}</Badge>
                  </div>
                  <h2 className="text-3xl font-bold mb-4">{events[0].title}</h2>
                  <p className="text-muted-foreground mb-6">
                    {events[0].description}
                  </p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>{events[0].date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{events[0].time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{events[0].location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{events[0].attendees} Expected Attendees</span>
                    </div>
                  </div>

                  <Button className="w-fit" size="lg">
                    Register Now
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Events Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.slice(1).map((event, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
              >
                <Card className="glass-panel overflow-hidden hover:scale-105 transition-all duration-300 group h-full flex flex-col">
                  <div
                    className="h-48 bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${event.image})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                    <div className="absolute top-4 right-4">
                      <Badge
                        className={
                          event.status === "Free Event"
                            ? "bg-green-500"
                            : event.status === "Limited Seats"
                            ? "bg-orange-500"
                            : ""
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">{event.type}</Badge>
                    </div>

                    <h3 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>

                    <p className="text-sm text-muted-foreground mb-4 flex-1">
                      {event.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{event.attendees} attendees</span>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-16"
          >
            <Card className="glass-panel p-8 text-center bg-gradient-to-br from-primary/10 to-primary/5">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                Want to Host an Event with Us?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Partner with JaagaX to organize property expos, seminars, or
                workshops and reach thousands of potential buyers
              </p>
              <Button size="lg">Contact Event Team</Button>
            </Card>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Events;
