"use client";

import React, { useMemo } from "react";
import { VoiceState } from "@/services/voice/voice.types";
import { cn } from "@/lib/utils";

export interface ElmoNeuralStructureProps {
  voiceState: VoiceState;
  size?: "sm" | "md" | "lg" | "full";
  className?: string;
}

interface NeuralNode {
  id: number;
  x: number;
  y: number;
  r: number;
}

interface NeuralEdge {
  from: number;
  to: number;
  opacity: number;
}

export function ElmoNeuralStructure({
  voiceState,
  size = "md",
  className,
}: ElmoNeuralStructureProps) {
  const isProcessing = voiceState === "PROCESSING";
  const isListening = voiceState === "LISTENING";
  const isSpeaking = voiceState === "ELMO_SPEAKING";

  const radiusMap = {
    sm: 36,
    md: 64,
    lg: 96,
    full: 128,
  };
  const R = radiusMap[size] || 64;

  // Generate deterministic golden-ratio distribution of neural nodes inside the sphere
  const { nodes, edges } = useMemo(() => {
    const count = size === "sm" ? 8 : 16;
    const nodeList: NeuralNode[] = [];
    const edgeList: NeuralEdge[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i * 137.5 * Math.PI) / 180;
      const dist = Math.sqrt((i + 1) / count) * R * 0.85;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist * 0.82;
      nodeList.push({
        id: i,
        x,
        y,
        r: i % 3 === 0 ? 2.2 : 1.4,
      });
    }

    // Connect close nodes with synaptic edges
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const dx = nodeList[i].x - nodeList[j].x;
        const dy = nodeList[i].y - nodeList[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < R * 0.52) {
          edgeList.push({
            from: i,
            to: j,
            opacity: Math.max(0.2, 1 - dist / (R * 0.52)),
          });
        }
      }
    }

    return { nodes: nodeList, edges: edgeList };
  }, [R, size]);

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center pointer-events-none select-none",
        className
      )}
      data-testid="elmo-neural-structure"
    >
      <svg
        viewBox="-160 -160 320 320"
        className={cn(
          "w-full h-full overflow-visible transition-all duration-700",
          isProcessing ? "animate-spin [animation-duration:18s] motion-reduce:animate-none" :
          isListening ? "animate-spin [animation-duration:36s] motion-reduce:animate-none" :
          "animate-spin [animation-duration:60s] motion-reduce:animate-none"
        )}
      >
        <defs>
          <linearGradient id="neuralLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0066FF" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* 1. Synaptic Interconnection Edges */}
        <g className="transition-opacity duration-500">
          {edges.map((edge, idx) => {
            const p1 = nodes[edge.from];
            const p2 = nodes[edge.to];
            if (!p1 || !p2) return null;
            return (
              <line
                key={`edge-${idx}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="url(#neuralLineGrad)"
                strokeWidth={isProcessing ? 1.4 : 0.8}
                opacity={isProcessing ? edge.opacity * 1.2 : isListening ? edge.opacity * 0.9 : edge.opacity * 0.6}
                strokeDasharray={isProcessing ? "3 3" : undefined}
                className={cn(
                  "transition-all duration-300",
                  isProcessing && "animate-pulse"
                )}
              />
            );
          })}
        </g>

        {/* 2. Neural Computational Nodes */}
        <g>
          {nodes.map((node) => (
            <g key={`node-${node.id}`}>
              {/* Soft glow halo on active processing */}
              {isProcessing && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r * 2.5}
                  fill="#00D2FF"
                  opacity="0.35"
                  className="animate-ping [animation-duration:2.5s]"
                />
              )}
              {/* Dense Node Point */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill={isSpeaking || isProcessing ? "#FFFFFF" : "#00D2FF"}
                className="transition-colors duration-300"
                style={{
                  filter: "drop-shadow(0 0 4px #00D2FF)",
                }}
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
