import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { TERMS_PDF_FILENAME, TERMS_PDF_URL } from "@/content/terms-cdla";
import { toast } from "sonner";

interface TermsDownloadButtonProps {
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export const TermsDownloadButton = ({
  label = "Download PDF",
  variant = "outline",
  size = "sm",
  className,
}: TermsDownloadButtonProps) => {
  const handleDownload = async () => {
    try {
      const res = await fetch(TERMS_PDF_URL);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = TERMS_PDF_FILENAME;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      toast.error(err?.message || "Unable to download the agreement");
    }
  };

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={handleDownload}>
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
};

export default TermsDownloadButton;
