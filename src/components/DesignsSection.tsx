import React from 'react';

interface Design {
  id: string;
  imageUrl: string;
  title: string;
}

interface DesignsSectionProps {
  designs: Design[];
}

const DesignsSection: React.FC<DesignsSectionProps> = ({ designs }) => {
  return (
    <div className="fixed right-6 top-6 bottom-24 w-48 z-10">
      {/* Main container with glass morphism effect */}
      <div className="h-full bg-black/80 backdrop-blur-md rounded-2xl border border-purple-500/30 shadow-lg shadow-purple-500/10 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-purple-500/20">
          <h2 className="text-white font-semibold text-lg tracking-wide">Designs</h2>
          <div className="mt-1 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-60"></div>
        </div>
        
        {/* Scrollable content area */}
        <div className="h-full pb-16 overflow-y-auto custom-scrollbar">
          <div className="p-3 space-y-3">
            {designs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                  <div className="w-6 h-6 rounded bg-purple-400/40"></div>
                </div>
                <p className="text-gray-400 text-sm">No designs yet</p>
                <p className="text-gray-500 text-xs mt-1">Upload images to see them here</p>
              </div>
            ) : (
              designs.map((design) => (
                <div
                  key={design.id}
                  className="group relative bg-gray-900/50 rounded-lg overflow-hidden border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 hover:shadow-md hover:shadow-purple-500/20"
                >
                  {/* Thumbnail container with 16:9 aspect ratio */}
                  <div className="relative w-full aspect-video bg-gray-800/50">
                    <img
                      src={design.imageUrl}
                      alt={design.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    
                    {/* Subtle overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  
                  {/* Title overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-white text-xs font-medium truncate">{design.title}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignsSection;