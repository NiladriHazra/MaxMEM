import type { ExportOptions, VerbosityPreset } from "./types";

export interface TranscriptLimits {
  userMessages: number;
  assistantMessages: number;
  commands: number;
  files: number;
  decisions: number;
  blockers: number;
  rawChat: number;
}

export interface VerbosityConfig {
  preset: VerbosityPreset;
  exportOptions: ExportOptions;
  transcript: TranscriptLimits;
}

export interface ResolveVerbosityInput {
  preset?: string | undefined;
}

export const defaultVerbosityPreset: VerbosityPreset = "compact";

export const verbosityPresets = {
  compact: {
    preset: "compact",
    exportOptions: {
      files: true,
      commands: true,
      decisions: true,
      blockers: true,
      rawChat: false,
    },
    transcript: {
      userMessages: 6,
      assistantMessages: 6,
      commands: 12,
      files: 24,
      decisions: 12,
      blockers: 12,
      rawChat: 0,
    },
  },
  standard: {
    preset: "standard",
    exportOptions: {
      files: true,
      commands: true,
      decisions: true,
      blockers: true,
      rawChat: false,
    },
    transcript: {
      userMessages: 10,
      assistantMessages: 10,
      commands: 20,
      files: 40,
      decisions: 20,
      blockers: 20,
      rawChat: 0,
    },
  },
  full: {
    preset: "full",
    exportOptions: {
      files: true,
      commands: true,
      decisions: true,
      blockers: true,
      rawChat: true,
    },
    transcript: {
      userMessages: 20,
      assistantMessages: 20,
      commands: 40,
      files: 80,
      decisions: 40,
      blockers: 40,
      rawChat: 60,
    },
  },
} satisfies Record<VerbosityPreset, VerbosityConfig>;

export const isVerbosityPreset = (value: string): value is VerbosityPreset =>
  value === "compact" || value === "standard" || value === "full";

export const resolveVerbosity = ({ preset }: ResolveVerbosityInput = {}) =>
  verbosityPresets[preset && isVerbosityPreset(preset) ? preset : defaultVerbosityPreset];
