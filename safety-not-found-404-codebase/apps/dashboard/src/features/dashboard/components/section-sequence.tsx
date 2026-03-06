import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { SEQUENCE_PROVIDER_OPTIONS } from "../constants";
import { RunTaskType } from "../types";
import { SectionProgress } from "./section-progress";

type SectionSequenceProps = {
  isRunning: boolean;
  sequenceProvider: string;
  activeRunType: RunTaskType | null;
  taskProgressByType: Record<RunTaskType, number | null>;
  onSequenceProviderChange: (nextProvider: string) => void;
  onRunSequence: () => void;
};

export function SectionSequence({
  isRunning,
  sequenceProvider,
  activeRunType,
  taskProgressByType,
  onSequenceProviderChange,
  onRunSequence,
}: SectionSequenceProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Section 1: Sequence</CardTitle>
        <CardDescription>AI-driven sequence benchmark runner.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400">Provider</label>
          <Select value={sequenceProvider} onChange={(event) => onSequenceProviderChange(event.target.value)}>
            {SEQUENCE_PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <Button className="w-full" disabled={isRunning} onClick={onRunSequence}>
          Run Sequence
        </Button>
        <SectionProgress
          sectionType="sequence"
          activeRunType={activeRunType}
          isRunning={isRunning}
          taskProgressByType={taskProgressByType}
        />
      </CardContent>
    </Card>
  );
}
