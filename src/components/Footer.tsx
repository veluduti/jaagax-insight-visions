const Footer = () => {
  return (
    <footer className="py-6 border-t border-border/50 bg-secondary/20">
      <div className="container mx-auto px-6">
        <p className="text-sm text-foreground/70 text-center">
          © {new Date().getFullYear()} JaagaX. All rights reserved. Made with ❤️ in India.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
