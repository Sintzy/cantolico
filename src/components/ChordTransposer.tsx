"use client";

import { useState, useEffect } from "react";
import { transposeText, extractChords } from "@/lib/chord-processor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChordTransposerProps {
  originalText: string;
  onTranspose: (transposedText: string, currentKey: string) => void;
  className?: string;
}

const KEYS = [
  { value: 0, label: "Original", short: "Orig" },
  { value: 1, label: "C# / Db", short: "C#" },
  { value: 2, label: "D", short: "D" },
  { value: 3, label: "D# / Eb", short: "D#" },
  { value: 4, label: "E", short: "E" },
  { value: 5, label: "F", short: "F" },
  { value: 6, label: "F# / Gb", short: "F#" },
  { value: 7, label: "G", short: "G" },
  { value: 8, label: "G# / Ab", short: "G#" },
  { value: 9, label: "A", short: "A" },
  { value: 10, label: "A# / Bb", short: "A#" },
  { value: 11, label: "B", short: "B" },
  { value: 0, label: "C", short: "C" }
];

export function ChordTransposer({ originalText, onTranspose, className = "" }: ChordTransposerProps) {
  const [currentTranspose, setCurrentTranspose] = useState(0);
  const [detectedChords, setDetectedChords] = useState<string[]>([]);

  useEffect(() => {
    const chords = extractChords(originalText);
    setDetectedChords(chords);
  }, [originalText]);

  useEffect(() => {
    const transposedText = transposeText(originalText, currentTranspose);
    const currentKey = KEYS.find(k => k.value === currentTranspose)?.short || "Orig";
    onTranspose(transposedText, currentKey);
  }, [originalText, currentTranspose, onTranspose]);

  const handleTransposeUp = () => {
    setCurrentTranspose(prev => (prev + 1) % 12);
  };

  const handleTransposeDown = () => {
    setCurrentTranspose(prev => (prev - 1 + 12) % 12);
  };

  const handleReset = () => {
    setCurrentTranspose(0);
  };

  const handleKeySelect = (value: string) => {
    setCurrentTranspose(parseInt(value));
  };

  if (detectedChords.length === 0) {
    return null; // Não mostra controles se não há acordes
  }

  return (
    <div className={`transpose-controls ${className}`}>
      <label className="text-sm font-medium">Transposição:</label>
      
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTransposeDown}
          className="w-8 h-8 p-0"
          title="Transpor para baixo (meio-tom)"
        >
          -
        </Button>
        
        <Select value={currentTranspose.toString()} onValueChange={handleKeySelect}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KEYS.map((key, index) => (
              <SelectItem key={`${key.value}-${index}`} value={key.value.toString()}>
                {key.short}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTransposeUp}
          className="w-8 h-8 p-0"
          title="Transpor para cima (meio-tom)"
        >
          +
        </Button>
      </div>

      {currentTranspose !== 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-xs"
        >
          Reset
        </Button>
      )}

      {detectedChords.length > 0 && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Acordes: {detectedChords.slice(0, 4).join(", ")}
          {detectedChords.length > 4 && "..."}
        </div>
      )}
    </div>
  );
}
