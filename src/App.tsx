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

type ProcessingMode = 'single' | 'batch';

function App() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('single');
  const [scriptContent, setScriptContent] = useState<string>('');
  const [batchScripts, setBatchScripts] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Starting...');
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

  const handleBatchScriptUpload = useCallback((files: FileList) => {
    const scriptFiles = Array.from(files).filter(file => 
      file.type === 'text/plain' || file.name.endsWith('.txt')
    );
    setBatchScripts(prev => [...prev, ...scriptFiles]);
    setError(null);
  }, []);

  const handleScriptChange = useCallback((content: string) => {
    setScriptContent(content);
    setError(null);
  }, []);

  const handleFileDeselect = useCallback((type: 'script' | 'video') => {
    if (type === 'script') {
      setScriptContent('');
      setBatchScripts([]);
    } else {
      setVideoFile(null);
    }
    setError(null);
  }, []);

  const handleRemoveBatchScript = useCallback((index: number) => {
    setBatchScripts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const estimateRuntime = useCallback(() => {
    if (processingMode === 'single' && !scriptContent.trim()) return '00:00:00';
    if (processingMode === 'batch' && batchScripts.length === 0) return '00:00:00';
    
    let estimatedLines = 0;
    
    if (processingMode === 'single') {
      const lines = scriptContent.split('\n').filter(line => line.trim());
      estimatedLines = lines.length || 1;
    } else {
      // For batch, estimate based on average script length
      estimatedLines = batchScripts.length * 10; // Assume 10 lines per script on average
    }
    
    const totalSeconds = estimatedLines * (options.baseDuration + (5 * options.wordDuration));
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [scriptContent, batchScripts, processingMode, options]);

  const handleProcess = async () => {
    if (processingMode === 'single' && (!scriptContent.trim() || !videoFile)) {
      setError('Please provide both script content and upload a video file');
      return;
    }
    
    if (processingMode === 'batch' && (batchScripts.length === 0 || !videoFile)) {
      setError('Please upload script files and a video file for batch processing');
      return;
    }

    setCurrentStep('processing');
    setIsProcessing(true);
    setProgress(0);
    setStatus('Starting...');
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
      const response = await fetch('http://localhost:3001/api/caption', {
        method: 'POST',
        body: formData
      });


      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Video processing failed. Please check your files and try again.');
      }

      const resultData = await response.json();
      const jobId = resultData.jobId;
      console.log(`Started processing with job ID: ${jobId}`);
      
      // Add a small delay before starting polling to ensure server has time to initialize
      setTimeout(() => {
        const progressInterval = setInterval(async () => {
          try {
            console.log(`Polling progress for job ${jobId}`);
            const progressResponse = await fetch(`http://localhost:3001/api/progress/${jobId}`);
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              console.log(`Progress update:`, progressData);
              setProgress(progressData.progress);
              setStatus(progressData.status || 'Processing...');
              
              if (progressData.progress >= 100) {
                clearInterval(progressInterval);
                
                // Fetch final results
                try {
                  const resultResponse = await fetch(`http://localhost:3001/api/result/${jobId}`);
                  if (resultResponse.ok) {
                    const finalResult = await resultResponse.json();
                    setResult(finalResult);
                    setCurrentStep('results');
                  } else {
                    throw new Error('Failed to fetch final results');
                  }
                } catch (resultError) {
                  console.error('Error fetching results:', resultError);
                  setError('Processing completed but failed to fetch results');
                  setCurrentStep('upload');
                }
              }
            } else {
              console.error('Failed to fetch progress:', progressResponse.status);
            }
          } catch (progressError) {
            console.error('Error fetching progress:', progressError);
          }
        }, 500); // Poll every 500ms for more responsive updates
        
        // Clear interval after 10 minutes as fallback
        setTimeout(() => clearInterval(progressInterval), 300000);
      }, 500); // Wait 500ms before starting polling
      
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
      setStatus('Starting...');
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setScriptContent('');
    setBatchScripts([]);
    setVideoFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus('Starting...');
    setIsProcessing(false);
    setCurrentStep('upload');
  };

  const canProceedToCustomize = processingMode === 'single' 
    ? (scriptContent.trim() && videoFile)
    : (batchScripts.length > 0 && videoFile);
    
  const canProcess = processingMode === 'single'
    ? (scriptContent.trim() && videoFile)
    : (batchScripts.length > 0 && videoFile);

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

        {/* Processing Mode Toggle */}
        <div className="flex justify-center mb-6 sm:mb-8 px-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20 shadow-xl">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  setProcessingMode('single');
                  setBatchScripts([]);
                  setScriptContent('');
                  setError(null);
                }}
                className={`relative px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-500 text-sm sm:text-base ${
                  processingMode === 'single'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    processingMode === 'single' ? 'bg-white' : 'bg-purple-300'
                  }`} />
                  <span>Single Video</span>
                </div>
                {processingMode === 'single' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl animate-pulse" />
                )}
              </button>
              
              <button
                onClick={() => {
                  setProcessingMode('batch');
                  setScriptContent('');
                  setBatchScripts([]);
                  setError(null);
                }}
                className={`relative px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-500 text-sm sm:text-base ${
                  processingMode === 'batch'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    processingMode === 'batch' ? 'bg-white' : 'bg-purple-300'
                  }`} />
                  <span>Batch Processing</span>
                </div>
                {processingMode === 'batch' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl animate-pulse" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-start justify-center px-4 pb-8">
          <div className="w-full max-w-6xl">
            
            {/* Update status message based on progress
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
            } */}
            
            {/* Upload Step */}
            {currentStep === 'upload' && (
              <div className="transform transition-all duration-700 ease-out">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-2xl">
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
                      {processingMode === 'single' ? 'Upload Your Files' : 'Upload Batch Files'}
                    </h2>
                    <p className="text-purple-200 text-sm sm:text-base">
                      {processingMode === 'single' 
                        ? 'Start by writing your script and uploading your video file'
                        : 'Upload multiple script files and one video file for batch processing'
                      }
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
                    {/* Script Section - Single or Batch */}
                    {processingMode === 'single' ? (
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
                    ) : (
                      <div className="relative h-80 sm:h-96">
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 hover:border-purple-400 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20 h-full flex flex-col">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl mr-3">
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white">Script Files</h3>
                                <p className="text-purple-200 text-xs sm:text-sm">Upload multiple .txt script files</p>
                              </div>
                            </div>
                            {batchScripts.length > 0 && (
                              <button
                                onClick={() => handleFileDeselect('script')}
                                className="p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-all duration-300 hover:scale-110"
                                title="Clear all scripts"
                              >
                                <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-300" />
                              </button>
                            )}
                          </div>
                          
                          {batchScripts.length === 0 ? (
                            <div className="flex-1 flex flex-col justify-center">
                              <div
                                className="border-2 border-dashed border-white/30 rounded-xl p-4 sm:p-6 text-center hover:border-purple-400 hover:bg-purple-500/10 transition-all duration-300 cursor-pointer"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  handleBatchScriptUpload(e.dataTransfer.files);
                                }}
                              >
                                <input
                                  type="file"
                                  multiple
                                  accept=".txt,text/plain"
                                  onChange={(e) => e.target.files && handleBatchScriptUpload(e.target.files)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="space-y-2">
                                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500/50 to-pink-500/50 rounded-xl mx-auto flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-white" />
                                  </div>
                                  <p className="text-white font-medium">Drop .txt files here</p>
                                  <p className="text-purple-200 text-sm">or click to browse</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                              <div className="space-y-2">
                                {batchScripts.map((file, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 sm:p-3 bg-white/10 rounded-lg border border-white/20 hover:border-purple-400 transition-all duration-300"
                                  >
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                      <FileText className="w-4 h-4 text-purple-300 flex-shrink-0" />
                                      <span className="text-white text-sm truncate">{file.name}</span>
                                      <span className="text-purple-300 text-xs">
                                        ({(file.size / 1024).toFixed(1)}KB)
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveBatchScript(index)}
                                      className="p-1 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-all duration-300 hover:scale-110 flex-shrink-0"
                                      title="Remove file"
                                    >
                                      <X className="w-3 h-3 text-red-300" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 text-center">
                                <div
                                  className="border border-dashed border-white/30 rounded-lg p-2 hover:border-purple-400 hover:bg-purple-500/10 transition-all duration-300 cursor-pointer"
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    handleBatchScriptUpload(e.dataTransfer.files);
                                  }}
                                >
                                  <input
                                    type="file"
                                    multiple
                                    accept=".txt,text/plain"
                                    onChange={(e) => e.target.files && handleBatchScriptUpload(e.target.files)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                  <p className="text-purple-200 text-xs">+ Add more files</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {batchScripts.length > 0 && (
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                              <span className="text-xs text-purple-300">
                                {batchScripts.length} files selected
                              </span>
                              <span className="text-xs text-purple-300">
                                {(batchScripts.reduce((acc, file) => acc + file.size, 0) / 1024).toFixed(1)}KB total
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
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

                  {((processingMode === 'single' && scriptContent.trim()) || (processingMode === 'batch' && batchScripts.length > 0)) && (
                    <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-300/30">
                      <div className="flex items-center text-white">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 mr-3 text-purple-300" />
                        <span className="text-sm sm:text-base lg:text-lg font-medium">
                          Estimated Runtime: {estimateRuntime()}
                          {processingMode === 'batch' && ` (${batchScripts.length} videos)`}
                        </span>
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
                    status={status}
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