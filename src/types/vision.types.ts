/**
 * ELMO Multimodal Vision Interface Abstractions
 * Forward-compatible contracts for future screen analysis, camera inputs,
 * and visual context injection into ELMO's realtime cognitive loop.
 */

export interface VisionBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionDetectedElement {
  id: string;
  label: string;
  confidence: number;
  boundingBox?: VisionBoundingBox;
  text?: string;
}

export interface ScreenContextSnapshot {
  timestamp: number;
  title?: string;
  url?: string;
  dimensions: {
    width: number;
    height: number;
  };
  elements?: VisionDetectedElement[];
  summary?: string;
}

export interface ImageInputProvider {
  captureFrame(): Promise<Blob | ArrayBuffer | string>;
  isSupported(): boolean;
  startCapture?(options?: { frameRate?: number }): Promise<void>;
  stopCapture?(): void;
}

export interface ScreenContextProvider {
  captureScreen(): Promise<ScreenContextSnapshot>;
  getActiveContext(): Promise<ScreenContextSnapshot | null>;
  isAvailable(): boolean;
}

export interface VisionService {
  analyzeImage(image: Blob | ArrayBuffer | string, prompt?: string): Promise<{
    description: string;
    detectedObjects: VisionDetectedElement[];
  }>;
  analyzeScreen(snapshot: ScreenContextSnapshot): Promise<{
    actionableSummary: string;
    suggestedActions?: string[];
  }>;
}
