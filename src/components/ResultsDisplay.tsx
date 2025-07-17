import React, { useState } from 'react';
import { Download, Play, Clock, FileText, Eye, Sparkles, CheckCircle, Share } from 'lucide-react';

interface ProcessingResult {
  success: boolean;
  duration: string;
  durationSeconds: number;
  subtitlesCount: number;
  previewUrl: string;
  downloadUrl: string;
  subtitles: any[];
}

interface ResultsDisplayProps {
  result: ProcessingResult;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [showAllSubtitles, setShowAllSubtitles] = useState(false);

  const handleDownload = () => {
    // Use the download endpoint which forces download
    window.location.href = `http://localhost:3001${result.downloadUrl}`;
  };

  const handlePreviewLoad = () => {
    setIsPreviewLoading(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Success Message */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-300/30 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
            </div>
          </div>
          <div className="ml-3 sm:ml-4">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
              🎉 Video Processing Complete!
            </h3>
            <p className="text-green-200 text-sm sm:text-base">
              Your captioned video is ready for download and sharing
            </p>
          </div>
        </div>
      </div>

      {/* Video Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-300/30 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl mr-3 sm:mr-4">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-purple-200 font-medium">Total Duration</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{result.duration}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-300/30 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl mr-3 sm:mr-4">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-blue-200 font-medium">Subtitles Generated</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{result.subtitlesCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl mr-2 sm:mr-3">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            Video Preview
          </h3>
          <div className="flex items-center space-x-2 text-purple-200">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-sm font-medium">First 3 seconds</span>
          </div>
        </div>
        
        <div className="relative bg-black/20 rounded-xl overflow-hidden border border-white/10 max-w-full">
          {isPreviewLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-white font-medium text-sm sm:text-base">Loading preview...</span>
              </div>
            </div>
          )}
          <img
            src={`http://localhost:3001${result.previewUrl}`}
            alt="Video preview with captions"
            className="w-full h-auto rounded-xl max-h-48 sm:max-h-64 lg:max-h-80 object-contain mx-auto"
            onLoad={handlePreviewLoad}
            onError={() => setIsPreviewLoading(false)}
          />
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-purple-200 text-xs sm:text-sm">
            Preview shows your video with the applied caption styling and positioning
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={handleDownload}
          className="group bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center shadow-2xl hover:shadow-green-500/25 hover:scale-105 text-sm sm:text-base"
        >
          <Download className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:animate-bounce" />
          <span>Download Video</span>
        </button>

        <button
          onClick={() => navigator.share && navigator.share({ title: 'My Captioned Video', url: window.location.href })}
          className="group bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center justify-center shadow-2xl hover:shadow-purple-500/25 hover:scale-105 text-sm sm:text-base"
        >
          <Share className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:animate-pulse" />
          <span>Share Video</span>
        </button>
      </div>

      {/* Subtitle Preview */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl mr-2 sm:mr-3">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            Subtitle Timeline
          </h3>
          <button
            onClick={() => setShowAllSubtitles(!showAllSubtitles)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 text-sm font-medium"
          >
            {showAllSubtitles ? 'Show Less' : 'Show All'}
          </button>
        </div>
        
        <div className="bg-black/20 rounded-xl p-3 sm:p-4 max-h-48 sm:max-h-64 overflow-y-auto border border-white/10 custom-scrollbar">
          <div className="space-y-2 sm:space-y-3">
            {(showAllSubtitles ? result.subtitles : result.subtitles.slice(0, 5)).map((subtitle, index) => (
              <div
                key={index}
                className="flex items-start space-x-2 sm:space-x-3 lg:space-x-4 p-2 sm:p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-6 sm:w-10 sm:h-7 lg:w-12 lg:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-1 gap-1 sm:gap-0">
                    <span className="text-purple-300 font-mono text-xs sm:text-sm">
                      {Math.floor(subtitle.start / 60).toString().padStart(2, '0')}:
                      {Math.floor(subtitle.start % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-white/50 hidden sm:inline">→</span>
                    <span className="text-purple-300 font-mono text-xs sm:text-sm">
                      {Math.floor(subtitle.end / 60).toString().padStart(2, '0')}:
                      {Math.floor(subtitle.end % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-white text-xs sm:text-sm leading-relaxed">{subtitle.text}</p>
                </div>
              </div>
            ))}
            
            {!showAllSubtitles && result.subtitles.length > 5 && (
              <div className="text-center py-3 sm:py-4">
                <button
                  onClick={() => setShowAllSubtitles(true)}
                  className="text-purple-300 hover:text-white transition-colors duration-300 text-xs sm:text-sm font-medium"
                >
                  ... and {result.subtitles.length - 5} more subtitles
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl mr-2 sm:mr-3">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </div>
          Processing Details
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-center">
          <div className="p-2 sm:p-3 bg-white/5 rounded-xl">
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{result.durationSeconds}s</p>
            <p className="text-xs text-purple-200">Total Seconds</p>
          </div>
          <div className="p-2 sm:p-3 bg-white/5 rounded-xl">
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{Math.round(result.subtitlesCount / result.durationSeconds * 60)}</p>
            <p className="text-xs text-purple-200">Subs/Minute</p>
          </div>
          <div className="p-2 sm:p-3 bg-white/5 rounded-xl">
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white">{(result.durationSeconds / result.subtitlesCount).toFixed(1)}s</p>
            <p className="text-xs text-purple-200">Avg Duration</p>
          </div>
          <div className="p-2 sm:p-3 bg-white/5 rounded-xl">
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white">100%</p>
            <p className="text-xs text-purple-200">Success Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;