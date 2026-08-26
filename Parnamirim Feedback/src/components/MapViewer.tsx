'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Neighborhood } from '../types';
import { PARNAMIRIM_NEIGHBORHOODS } from '../data/neighborhoods';

interface MapViewerProps {
  selectedNeighborhood: Neighborhood | null;
  onSelectNeighborhood: (neighborhood: Neighborhood | null) => void;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  selectedNeighborhood,
  onSelectNeighborhood,
}) => {
  const [hoveredNeighborhood, setHoveredNeighborhood] = useState<Neighborhood | null>(null);

  // Ajuste do viewBox focal orquestrado
  const viewBox = selectedNeighborhood
    ? `${selectedNeighborhood.center.x - 110} ${selectedNeighborhood.center.y - 85} 220 170`
    : '150 140 700 560';

  return (
    <div className="relative w-full h-full min-h-[580px] flex items-center justify-center overflow-hidden select-none">
      {/* Botão de Zoom Out / Voltar */}
      <AnimatePresence>
        {selectedNeighborhood && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-6 left-6 z-30 flex items-center gap-3"
          >
            <button
              onClick={() => onSelectNeighborhood(null)}
              className="liquid-glass-pill px-5 py-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-white bg-slate-900/60 hover:bg-slate-800/80 border border-white/20 shadow-2xl group"
            >
              <RotateCcw className="w-4 h-4 text-sky-400 group-hover:-rotate-90 transition-transform duration-300" />
              <span>Visão Geral da Cidade</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip de Hover */}
      <AnimatePresence>
        {hoveredNeighborhood && !selectedNeighborhood && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-20 pointer-events-none z-30 liquid-glass px-4 py-2 rounded-xl text-center shadow-2xl"
          >
            <p className="text-xs font-bold text-white">{hoveredNeighborhood.name}</p>
            <p className="text-[10px] text-sky-300">Clique para dar zoom e visualizar os feedbacks</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SVG Interativo com Transições Perfeitas */}
      <motion.svg
        viewBox={viewBox}
        className="w-full h-full max-h-[82vh] drop-shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ cursor: selectedNeighborhood ? 'default' : 'pointer' }}
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g className="transition-all duration-700">
          {PARNAMIRIM_NEIGHBORHOODS.map((neighborhood) => {
            const isSelected = selectedNeighborhood?.id === neighborhood.id;
            const isDimmed = selectedNeighborhood && !isSelected;

            return (
              <motion.path
                key={neighborhood.id}
                d={neighborhood.path}
                fill={neighborhood.color}
                stroke={isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.45)'}
                strokeWidth={isSelected ? 3 : 1.2}
                strokeLinejoin="round"
                strokeLinecap="round"
                filter={isSelected ? 'url(#glow)' : undefined}
                className="transition-all duration-500 origin-center"
                style={{
                  opacity: isDimmed ? 0.18 : 1,
                  filter: isDimmed ? 'grayscale(75%) blur(0.4px)' : 'none',
                }}
                whileHover={
                  !selectedNeighborhood
                    ? {
                        scale: 1.02,
                        fill: neighborhood.highlightColor,
                        stroke: '#ffffff',
                        strokeWidth: 2,
                        filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.4))',
                      }
                    : {}
                }
                onClick={() => onSelectNeighborhood(neighborhood)}
                onMouseEnter={() => setHoveredNeighborhood(neighborhood)}
                onMouseLeave={() => setHoveredNeighborhood(null)}
              />
            );
          })}
        </g>
      </motion.svg>
    </div>
  );
};
