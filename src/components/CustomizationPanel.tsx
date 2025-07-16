import React from 'react';
import { Palette, Type, AlignCenter, Clock, Sparkles } from 'lucide-react';

interface CaptionOptions {
  baseDuration: number;
  wordDuration: number;
  splitMode: string;
  fontColor: string;
  fontWeight: string;
  fontSize: number;
  position: string;
}

interface CustomizationPanelProps {
  options: CaptionOptions;
  onOptionsChange: (options: CaptionOptions) => void;
}

const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  options,
  onOptionsChange
}) => {
  const handleChange = (key: keyof CaptionOptions, value: any) => {
    onOptionsChange({
      ...options,
      [key]: value
    });
  };

  const colorOptions = [
    { label: 'Pink', value: '#EC4899', gradient: 'from-pink-500 to-pink-600' },
    { label: 'Purple', value: '#8B5CF6', gradient: 'from-purple-500 to-purple-600' },
    { label: 'Blue', value: '#3B82F6', gradient: 'from-blue-500 to-blue-600' },
    { label: 'Green', value: '#10B981', gradient: 'from-green-500 to-green-600' },
    { label: 'Orange', value: '#F59E0B', gradient: 'from-orange-500 to-orange-600' },
    { label: 'Red', value: '#EF4444', gradient: 'from-red-500 to-red-600' },
    { label: 'White', value: '#FFFFFF', gradient: 'from-gray-100 to-white' },
    { label: 'Black', value: '#000000', gradient: 'from-gray-800 to-black' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Timing Settings */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl mr-2 sm:mr-3">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          Timing Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-sm font-semibold text-purple-200">
              Base Duration (seconds)
            </label>
            <div className="relative">
              <input
                type="number"
                value={options.baseDuration}
                onChange={(e) => handleChange('baseDuration', parseFloat(e.target.value))}
                step="0.1"
                min="0.1"
                max="10"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-sm font-semibold text-purple-200">
              Per Word Duration (seconds)
            </label>
            <div className="relative">
              <input
                type="number"
                value={options.wordDuration}
                onChange={(e) => handleChange('wordDuration', parseFloat(e.target.value))}
                step="0.1"
                min="0.1"
                max="2"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Font Settings */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl mr-2 sm:mr-3">
            <Type className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          Font Settings
        </h3>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-sm font-semibold text-purple-200">
              Font Size: {options.fontSize}px
            </label>
            <div className="relative">
              <input
                type="range"
                value={options.fontSize}
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                min="12"
                max="48"
                className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs sm:text-sm text-purple-300 mt-2">
                <span>12px</span>
                <span className="font-semibold text-white">{options.fontSize}px</span>
                <span>48px</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-sm font-semibold text-purple-200">
              Font Weight
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {['normal', 'bold'].map((weight) => (
                <button
                  key={weight}
                  onClick={() => handleChange('fontWeight', weight)}
                  className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl border transition-all duration-300 font-semibold capitalize text-sm sm:text-base ${
                    options.fontWeight === weight
                      ? 'border-purple-400 bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white shadow-lg'
                      : 'border-white/20 bg-white/5 text-purple-200 hover:border-purple-400 hover:bg-purple-500/20'
                  }`}
                >
                  {weight}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Color Settings */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl mr-2 sm:mr-3">
            <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          Color Settings
        </h3>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                onClick={() => handleChange('fontColor', color.value)}
                className={`group relative w-full h-12 sm:h-14 lg:h-16 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                  options.fontColor === color.value
                    ? 'border-white shadow-2xl scale-105'
                    : 'border-white/30 hover:border-white/60'
                }`}
                title={color.label}
              >
                <div className={`w-full h-full bg-gradient-to-br ${color.gradient} rounded-lg`}>
                  {color.value === '#FFFFFF' && (
                    <div className="w-full h-full border border-gray-300 rounded-lg bg-white"></div>
                  )}
                </div>
                {options.fontColor === color.value && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-sm font-semibold text-purple-200">
              Custom Color
            </label>
            <div className="relative">
              <input
                type="color"
                value={options.fontColor}
                onChange={(e) => handleChange('fontColor', e.target.value)}
                className="w-full h-10 sm:h-12 rounded-xl border border-white/20 cursor-pointer bg-white/10"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Position Settings */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl mr-2 sm:mr-3">
            <AlignCenter className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          Position Settings
        </h3>
        
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { key: 'top', label: 'Top', icon: '⬆️' },
            { key: 'center', label: 'Center', icon: '⏺️' },
            { key: 'bottom', label: 'Bottom', icon: '⬇️' }
          ].map((position) => (
            <button
              key={position.key}
              onClick={() => handleChange('position', position.key)}
              className={`px-3 sm:px-4 py-3 sm:py-4 rounded-xl border transition-all duration-300 font-semibold flex flex-col items-center space-y-1 sm:space-y-2 text-sm sm:text-base ${
                options.position === position.key
                  ? 'border-purple-400 bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white shadow-lg transform scale-105'
                  : 'border-white/20 bg-white/5 text-purple-200 hover:border-purple-400 hover:bg-purple-500/20 hover:scale-105'
              }`}
            >
              <span className="text-lg sm:text-xl lg:text-2xl">{position.icon}</span>
              <span>{position.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Split Mode */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl mr-2 sm:mr-3">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          Split Mode
        </h3>
        
        <div className="relative">
          <select
            value={options.splitMode}
            onChange={(e) => handleChange('splitMode', e.target.value)}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 appearance-none cursor-pointer text-sm sm:text-base"
          >
            <option value="line" className="bg-gray-800">One line per subtitle</option>
            <option value="sentence" className="bg-gray-800">One sentence per subtitle</option>
            <option value="paragraph" className="bg-gray-800">One paragraph per subtitle</option>
          </select>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      </div>
    </div>
  );
};

export default CustomizationPanel;