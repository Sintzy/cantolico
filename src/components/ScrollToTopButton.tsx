import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      // Show button when near bottom (e.g., last 20% of page)
      setShow(scrollY + windowHeight > docHeight * 0.8);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "1rem",
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: show ? "auto" : "none",
      }}
    >
      <Button
        size="icon"
        variant="outline"
        onClick={scrollToTop}
        aria-label="Ir para o topo"
        className="rounded-full shadow-md transition-transform duration-300 hover:scale-110 bg-background/80 backdrop-blur-md"
        style={{
          width: "3rem",
          height: "3rem",
        }}
      >
        <ChevronUp size={24} />
      </Button>
    </div>
  );
}
