import React, { useState, useCallback } from 'react';
import { Upload, Play, Download, Settings, Clock, FileText, Video, ArrowRight, ArrowLeft, Sparkles, Zap } from 'lucide-react';
import DragDropZone from './components/DragDropZone';
import CustomizationPanel from './components/CustomizationPanel';
import ProgressIndicator from './components/ProgressIndicator';
import ResultsDisplay from './components/ResultsDisplay';

interface CaptionOptions {
  baseDuration: number;
  wordDuration: number;
  splitMode: string;
  fontColor: string;
  fontWeight: string;
  fontSize: number;
  position: string;
}

interface ProcessingResult {
  success: boolean;
  duration: string;
  durationSeconds: number;
  subtitlesCount: number;
  previewUrl: string;
  downloadUrl: string;
  subtitles: any[];
}

type Step = 'upload' | 'customize' | 'processing' | 'results';

function App() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [scriptFile, setScriptFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [options, setOptions] = useState<CaptionOptions>({
    baseDuration: 3,
    wordDuration: 0.3,
    splitMode: 'line',
    fontColor: '#EC4899',
    fontWeight: 'bold',
    fontSize: 24,
    position: 'bottom'
  });

  const handleFileUpload = useCallback((files: FileList, type: 'script' | 'video') => {
    const file = files[0];
    if (type === 'script') {
      setScriptFile(file);
    } else {
      setVideoFile(file);
    }
    setError(null);
  }, []);

  const estimateRuntime = useCallback(() => {
    if (!scriptFile) return '00:00:00';
    
    const estimatedLines = Math.ceil(scriptFile.size / 50);
    const totalSeconds = estimatedLines * (options.baseDuration + (5 * options.wordDuration));
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [scriptFile, options]);

  const handleProcess = async () => {
    if (!scriptFile || !videoFile) {
      setError('Please upload both script and video files');
      return;
    }

    setCurrentStep('processing');
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('script', scriptFile);
      formData.append('video', videoFile);
      
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 8, 90));
      }, 800);

      const response = await fetch('http://localhost:3001/api/caption', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      const resultData = await response.json();
      setResult(resultData);
      setCurrentStep('results');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProgress(0);
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setScriptFile(null);
    setVideoFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setIsProcessing(false);
    setCurrentStep('upload');
  };

  const canProceedToCustomize = scriptFile && videoFile;
  const canProcess = scriptFile && videoFile;

  const stepIndicators = [
    { key: 'upload', label: 'Upload', icon: Upload },
    { key: 'customize', label: 'Customize', icon: Settings },
    { key: 'processing', label: 'Processing', icon: Zap },
    { key: 'results', label: 'Results', icon: Download }
  ];

  const getStepIndex = (step: Step) => stepIndicators.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="text-center py-8 px-4">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-2xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4">
            Growloom Captioner
          </h1>
          <p className="text-lg sm:text-xl text-purple-200 max-w-2xl mx-auto leading-relaxed px-4">
            Transform your videos with AI-powered captions. Upload, customize, and create stunning captioned content in minutes.
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center mb-8 px-4">
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8 bg-white/10 backdrop-blur-lg rounded-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border border-white/20 overflow-x-auto max-w-full">
            {stepIndicators.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.key === currentStep;
              const isCompleted = getStepIndex(currentStep) > index;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center space-x-1 sm:space-x-2 transition-all duration-500 whitespace-nowrap ${
                    isActive ? 'text-white scale-110' : isCompleted ? 'text-green-300' : 'text-purple-300'
                  }`}>
                    <div className={`p-1.5 sm:p-2 rounded-full transition-all duration-500 ${
                      isActive 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg' 
                        : isCompleted 
                        ? 'bg-green-500' 
                        : 'bg-white/20'
                    }`}>
                      <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                    <span className="font-medium text-sm sm:text-base hidden sm:inline">{step.label}</span>
                  </div>
                  {index < stepIndicators.length - 1 && (
                    <div className={`w-4 sm:w-6 lg:w-8 h-0.5 mx-2 sm:mx-3 lg:mx-4 transition-all duration-500 ${
                      getStepIndex(currentStep) > index ? 'bg-green-300' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-start justify-center px-4 pb-8">
          <div className="w-full max-w-4xl">
            
            {/* Upload Step */}
            {currentStep === 'upload' && (
              <div className="transform transition-all duration-700 ease-out">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-2xl">
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Upload Your Files</h2>
                    <p className="text-purple-200 text-sm sm:text-base">Start by uploading your script and video files</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
                    <DragDropZone
                      onFileUpload={(files) => handleFileUpload(files, 'script')}
                      acceptedTypes=".txt"
                      icon={FileText}
                      title="Script File"
                      description="Upload your .txt script file"
                      file={scriptFile}
                    />
                    
                    <DragDropZone
                      onFileUpload={(files) => handleFileUpload(files, 'video')}
                      acceptedTypes=".mp4,.mov,.avi,.mkv,.webm,.flv,.wmv,.m4v,.3gp,.MP4,.MOV,.AVI,.MKV,.WEBM,.FLV,.WMV,.M4V,.3GP"
                      icon={Video}
                      title="Video File"
                      description="Upload your video file (MP4, MOV, AVI, etc.)"
                      file={videoFile}
                    />
                  </div>

                  {scriptFile && (
                    <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-300/30">
                      <div className="flex items-center text-white">
                        <Clock className="w-6 h-6 mr-3 text-purple-300" />
                        <span className="text-base sm:text-lg font-medium">Estimated Runtime: {estimateRuntime()}</span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mb-6 sm:mb-8 p-4 bg-red-500/20 border border-red-300/30 rounded-2xl">
                      <p className="text-red-200 text-sm sm:text-base">{error}</p>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <button
                      onClick={() => setCurrentStep('customize')}
                      disabled={!canProceedToCustomize}
                      className="group bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-2xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center shadow-2xl hover:shadow-purple-500/25 hover:scale-105 text-sm sm:text-base"
                    >
                      <span>Continue to Customize</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Customize Step */}
            {currentStep === 'customize' && (
              <div className="transform transition-all duration-700 ease-out">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-2xl">
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Customize Your Captions</h2>
                    <p className="text-purple-200 text-sm sm:text-base">Adjust the styling and timing to match your vision</p>
                  </div>
                  
                  <CustomizationPanel
                    options={options}
                    onOptionsChange={setOptions}
                  />

                  <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6 sm:mt-8">
                    <button
                      onClick={() => setCurrentStep('upload')}
                      className="group bg-white/20 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-2xl hover:bg-white/30 transition-all duration-300 flex items-center justify-center backdrop-blur-sm text-sm sm:text-base"
                    >
                      <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                      <span>Back to Upload</span>
                    </button>
                    
                    <button
                      onClick={handleProcess}
                      disabled={!canProcess}
                      className="group bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-2xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-2xl hover:shadow-green-500/25 hover:scale-105 text-sm sm:text-base"
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      <span>Generate Captions</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Step */}
            {currentStep === 'processing' && (
              <div className="transform transition-all duration-700 ease-out">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 lg:p-12 border border-white/20 shadow-2xl text-center">
                  <div className="mb-6 sm:mb-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 animate-pulse">
                      <Zap className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Processing Your Video</h2>
                    <p className="text-purple-200 text-sm sm:text-base">Our AI is working its magic on your content</p>
                  </div>
                  
                  <ProgressIndicator 
                    progress={progress}
                    status="Processing your video with captions..."
                  />
                </div>
              </div>
            )}

            {/* Results Step */}
            {currentStep === 'results' && result && (
              <div className="transform transition-all duration-700 ease-out">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-2xl">
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your Video is Ready!</h2>
                    <p className="text-purple-200 text-sm sm:text-base">Preview your captioned video and download when ready</p>
                  </div>
                  
                  <ResultsDisplay result={result} />

                  <div className="flex justify-center mt-6 sm:mt-8">
                    <button
                      onClick={handleReset}
                      className="group bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center shadow-2xl hover:shadow-purple-500/25 hover:scale-105 text-sm sm:text-base"
                    >
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      <span>Create Another Video</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;