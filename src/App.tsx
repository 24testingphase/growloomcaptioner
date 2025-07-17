import React, { useState, useCallback } from 'react';
import { Upload, Play, Download, Settings, Clock, FileText, Video, ArrowRight, ArrowLeft, Sparkles, Zap, X } from 'lucide-react';
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
  const [scriptContent, setScriptContent] = useState<string>('');
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

  const handleFileUpload = useCallback((files: FileList, type: 'video') => {
    const file = files[0];
    if (type === 'video') {
      setVideoFile(file);
    }
    setError(null);
  }, []);

  const handleScriptChange = useCallback((content: string) => {
    setScriptContent(content);
    setError(null);
  }, []);

  const handleFileDeselect = useCallback((type: 'script' | 'video') => {
    if (type === 'script') {
      setScriptContent('');
    } else {
      setVideoFile(null);
    }
    setError(null);
  }, []);

  const estimateRuntime = useCallback(() => {
    if (!scriptContent.trim()) return '00:00:00';
    
    const lines = scriptContent.split('\n').filter(line => line.trim());
    const estimatedLines = lines.length || 1;
    const totalSeconds = estimatedLines * (options.baseDuration + (5 * options.wordDuration));
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [scriptContent, options]);

  const handleProcess = async () => {
    if (!scriptContent.trim() || !videoFile) {
      setError('Please provide both script content and upload a video file');
      return;
    }

    setCurrentStep('processing');
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      
      // Create a blob from script content and append as file
      const scriptBlob = new Blob([scriptContent], { type: 'text/plain' });
      formData.append('script', scriptBlob, 'script.txt');
      formData.append('video', videoFile);
      
      Object.entries(options).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      // Start processing request
      const startTime = Date.now();
      let jobId = null;

      const response = await fetch('http://localhost:3001/api/caption', {
        method: 'POST',
        body: formData
      });


      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Video processing failed. Please check your files and try again.');
      }

      const resultData = await response.json();
      jobId = resultData.jobId;
      
      // Start polling for progress updates
      if (jobId) {
        const progressInterval = setInterval(async () => {
          try {
            const progressResponse = await fetch(`http://localhost:3001/api/progress/${jobId}`);
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              setProgress(progressData.progress);
              
              if (progressData.progress >= 100) {
                clearInterval(progressInterval);
              }
            }
          } catch (progressError) {
            console.error('Error fetching progress:', progressError);
          }
        }, 1000);
        
        // Clear interval after 5 minutes as fallback
        setTimeout(() => clearInterval(progressInterval), 300000);
      }
      
      setProgress(100);
      setResult(resultData);
      setCurrentStep('results');
      
    } catch (err) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Unable to connect to the server. Please ensure the backend is running on port 3001.';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setProgress(0);
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setScriptContent('');
    setVideoFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setIsProcessing(false);
    setCurrentStep('upload');
  };

  const canProceedToCustomize = scriptContent.trim() && videoFile;
  const canProcess = scriptContent.trim() && videoFile;

  const stepIndicators = [
    { key: 'upload', label: 'Upload', icon: Upload },
    { key: 'customize', label: 'Customize', icon: Settings },
    { key: 'processing', label: 'Processing', icon: Zap },
    { key: 'results', label: 'Results', icon: Download }
  ];

  const getStepIndex = (step: Step) => stepIndicators.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-y-auto">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="text-center py-6 sm:py-8 px-4">
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <button 
              onClick={handleReset}
              className="group p-3 sm:p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-110 cursor-pointer"
              title="Click to refresh and start over"
            >
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white group-hover:animate-spin" />
            </button>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-3 sm:mb-4">
            Growloom Captioner
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-purple-200 max-w-2xl mx-auto leading-relaxed px-4">
            Transform your videos with AI-powered captions. Upload, customize, and create stunning captioned content in minutes.
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center mb-6 sm:mb-8 px-4">
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8 bg-white/10 backdrop-blur-lg rounded-full px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-3 lg:py-4 border border-white/20 overflow-x-auto max-w-full">
            {stepIndicators.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.key === currentStep;
              const isCompleted = getStepIndex(currentStep) > index;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center space-x-1 sm:space-x-2 transition-all duration-500 whitespace-nowrap ${
                    isActive ? 'text-white scale-110' : isCompleted ? 'text-green-300' : 'text-purple-300'
                  }`}>
                    <div className={`p-1 sm:p-1.5 lg:p-2 rounded-full transition-all duration-500 ${
                      isActive 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg' 
                        : isCompleted 
                        ? 'bg-green-500' 
                        : 'bg-white/20'
                    }`}>
                      <Icon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    </div>
                    <span className="font-medium text-xs sm:text-sm lg:text-base hidden sm:inline">{step.label}</span>
                  </div>
                  {index < stepIndicators.length - 1 && (
                    <div className={`w-3 sm:w-4 lg:w-6 xl:w-8 h-0.5 mx-1 sm:mx-2 lg:mx-3 xl:mx-4 transition-all duration-500 ${
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
          <div className="w-full max-w-6xl">
            
            // Update status message based on progress
            let statusMessage = progressData.status || 'Processing...';
            if (progressData.progress >= 95) {
              statusMessage = 'Finalizing video...';
            } else if (progressData.progress >= 55) {
              statusMessage = 'Processing video with captions...';
            } else if (progressData.progress >= 35) {
              statusMessage = 'Creating preview...';
            } else if (progressData.progress >= 20) {
              statusMessage = 'Generating subtitles...';
            } else if (progressData.progress >= 10) {
              statusMessage = 'Parsing script...';
            }
            
            {/* Upload Step */}
            {currentStep === 'upload' && (
              <div className="transform transition-all duration-700 ease-out">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-2xl">
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Upload Your Files</h2>
                    <p className="text-purple-200 text-sm sm:text-base">Start by writing your script and uploading your video file</p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
                    {/* Script Content Section */}
                    <div className="relative h-80 sm:h-96">
                      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 hover:border-purple-400 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl mr-3">
                              <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white">Script Content</h3>
                              <p className="text-purple-200 text-xs sm:text-sm">Write or paste your script here</p>
                            </div>
                          </div>
                          {scriptContent.trim() && (
                            <button
                              onClick={() => handleFileDeselect('script')}
                              className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-all duration-300 hover:scale-110"
                              title="Clear script"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-300" />
                            </button>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col">
                          <textarea
                            value={scriptContent}
                            onChange={(e) => handleScriptChange(e.target.value)}
                            placeholder="Enter your script here... Each line will become a subtitle."
                            className="w-full flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none text-sm sm:text-base"
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-purple-300">
                              {scriptContent.split('\n').filter(line => line.trim()).length} lines
                            </span>
                            <span className="text-xs text-purple-300">
                              {scriptContent.length} characters
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Video Upload Section */}
                    <div className="relative h-80 sm:h-96">
                      <DragDropZone
                        onFileUpload={(files) => handleFileUpload(files, 'video')}
                        acceptedTypes=".mp4,.MP4,.mov,.MOV,.avi,.AVI,.mkv,.MKV,.webm,.WEBM,.flv,.FLV,.wmv,.WMV,.m4v,.M4V,.3gp,.3GP,video/*"
                        icon={Video}
                        title="Video File"
                        description="Upload your video file (MP4, MOV, AVI, etc.)"
                        file={videoFile}
                        onFileDeselect={() => handleFileDeselect('video')}
                      />
                    </div>
                  </div>

                  {scriptContent.trim() && (
                    <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-300/30">
                      <div className="flex items-center text-white">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-purple-300" />
                        <span className="text-sm sm:text-base lg:text-lg font-medium">Estimated Runtime: {estimateRuntime()}</span>
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
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Customize Your Captions</h2>
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
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Processing Your Video</h2>
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
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Your Video is Ready!</h2>
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