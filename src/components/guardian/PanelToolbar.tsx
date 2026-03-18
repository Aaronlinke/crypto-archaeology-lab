import { Download, FileJson, FileSpreadsheet, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PanelToolbarProps {
  onDownloadJSON?: () => void;
  onDownloadCSV?: () => void;
  onSettings?: () => void;
  className?: string;
}

const PanelToolbar = ({ onDownloadJSON, onDownloadCSV, onSettings, className = "" }: PanelToolbarProps) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {(onDownloadJSON || onDownloadCSV) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors" title="Download">
              <Download className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border min-w-[140px]">
            {onDownloadJSON && (
              <DropdownMenuItem onClick={onDownloadJSON} className="text-xs gap-2 cursor-pointer">
                <FileJson className="h-3.5 w-3.5" />
                Export JSON
              </DropdownMenuItem>
            )}
            {onDownloadCSV && (
              <DropdownMenuItem onClick={onDownloadCSV} className="text-xs gap-2 cursor-pointer">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export CSV
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {onSettings && (
        <button
          onClick={onSettings}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
          title="Settings"
        >
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
        </button>
      )}
    </div>
  );
};

export default PanelToolbar;
