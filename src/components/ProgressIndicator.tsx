import React from 'react';
import { Loader2, Zap, CheckCircle, Clock } from 'lucide-react';

interface ProgressIndicatorProps {
  progress: number;
  status: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ progress, status }) => {
  const steps = [
    { label: 'Parsing script', threshold: 15, icon: Clock },
    { label: 'Generating subtitles', threshold: 30, icon: Sparkles },
    { label: 'Creating preview', threshold: 50, icon: Zap },
    { label: 'Processing video', threshold: 95, icon: Loader2 }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Main Progress Circle */}
      <div className="flex items-center justify-center">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32">
          <svg className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="url(#progressGradient)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">{progress}%</div>
              <div className="text-xs sm:text-sm text-purple-200">Complete</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
          <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-white animate-spin" />
          </div>
          <span className="text-lg sm:text-xl font-semibold text-white">{status}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 rounded-full h-2 sm:h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-green-500 rounded-full transition-all duration-1000 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = progress >= step.threshold;
          const isActive = progress >= (steps[index - 1]?.threshold || 0) && progress < step.threshold;
          
          return (
            <div
              key={index}
              className={`flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl transition-all duration-500 ${
                isCompleted
                  ? 'bg-green-500/20 border border-green-300/30'
                  : isActive
                  ? 'bg-purple-500/20 border border-purple-300/30 animate-pulse'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className={`p-1.5 sm:p-2 rounded-lg transition-all duration-500 ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isActive
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-pulse'
                  : 'bg-white/10 text-white/50'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : isActive && step.icon === Loader2 ? (
                  <StepIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : (
                  <StepIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              
              <div className="flex-1">
                <span className={`font-medium transition-colors duration-500 text-sm sm:text-base ${
                  isCompleted
                    ? 'text-green-300'
                    : isActive
                    ? 'text-white'
                    : 'text-white/60'
                }`}>
                  {step.label}
                </span>
              </div>
              
              <div className={`transition-all duration-500 text-lg sm:text-xl ${
                isCompleted
                  ? 'text-green-400 scale-110'
                  : isActive
                  ? 'text-purple-400 animate-pulse'
                  : 'text-white/30'
              }`}>
                {isCompleted ? '✓' : isActive ? '⏳' : '○'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Estimated Time */}
      <div className="text-center p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center justify-center space-x-2 text-purple-200">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="font-medium text-sm sm:text-base">
            Estimated time remaining: {Math.max(0, Math.ceil((100 - progress) * 0.5))} seconds
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;