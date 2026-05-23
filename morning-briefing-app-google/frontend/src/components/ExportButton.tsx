import { DownloadSimple } from '@phosphor-icons/react';
import { downloadMarkdown } from '../mocks/exportTemplate';
import { Button } from './ui/Button';
import type { Briefing } from '../types/briefing';

interface ExportButtonProps {
  briefing: Briefing;
}

export function ExportButton({ briefing }: ExportButtonProps) {
  return (
    <Button variant="outline" onClick={() => downloadMarkdown(briefing)}>
      <DownloadSimple size={14} />
      Export as Markdown
    </Button>
  );
}
