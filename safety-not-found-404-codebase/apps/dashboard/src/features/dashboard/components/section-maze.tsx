import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { MAZE_LANGUAGE_OPTIONS } from "../constants";
import { RunTaskType } from "../types";
import { SectionProgress } from "./section-progress";

type SectionMazeProps = {
  isRunning: boolean;
  mazeLanguage: string;
  activeRunType: RunTaskType | null;
  taskProgressByType: Record<RunTaskType, number | null>;
  onMazeLanguageChange: (nextLanguage: string) => void;
  onRunMaze: () => void;
};

export function SectionMaze({
  isRunning,
  mazeLanguage,
  activeRunType,
  taskProgressByType,
  onMazeLanguageChange,
  onRunMaze,
}: SectionMazeProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Section 2: Maze</CardTitle>
        <CardDescription>Local pipeline for maze generation and visualization (no LLM call).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-400">Language</label>
          <Select value={mazeLanguage} onChange={(event) => onMazeLanguageChange(event.target.value)}>
            {MAZE_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <Button className="w-full" variant="secondary" disabled={isRunning} onClick={onRunMaze}>
          Run Maze Pipeline
        </Button>
        <SectionProgress
          sectionType="maze"
          activeRunType={activeRunType}
          isRunning={isRunning}
          taskProgressByType={taskProgressByType}
        />
      </CardContent>
    </Card>
  );
}
