import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ===== GPU DETECTION AND CONFIGURATION =====
let gpuConfig = {
  available: false,
  type: 'cpu',
  encoder: 'libx264',
  hwaccel: null,
  preset: 'medium'
};

// Function to detect GPU capabilities
async function detectGPUCapabilities() {
  console.log('🔍 Detecting GPU capabilities...');
  
  const gpuTests = [
    {
      name: 'NVIDIA NVENC',
      type: 'nvidia',
      encoder: 'h264_nvenc',
      hwaccel: 'cuda',
      preset: 'fast',
      testArgs: ['-f', 'lavfi', '-i', 'testsrc2=duration=1:size=320x240:rate=1', '-c:v', 'h264_nvenc', '-preset', 'fast', '-f', 'null', '-']
    },
    {
      name: 'Intel Quick Sync',
      type: 'intel',
      encoder: 'h264_qsv',
      hwaccel: 'qsv',
      preset: 'fast',
      testArgs: ['-f', 'lavfi', '-i', 'testsrc2=duration=1:size=320x240:rate=1', '-c:v', 'h264_qsv', '-preset', 'fast', '-f', 'null', '-']
    },
    {
      name: 'AMD AMF',
      type: 'amd',
      encoder: 'h264_amf',
      hwaccel: null,
      preset: 'speed',
      testArgs: ['-f', 'lavfi', '-i', 'testsrc2=duration=1:size=320x240:rate=1', '-c:v', 'h264_amf', '-quality', 'speed', '-f', 'null', '-']
    }
  ];

  for (const gpu of gpuTests) {
    try {
      console.log(`   Testing ${gpu.name}...`);
      await new Promise((resolve, reject) => {
        const testProcess = spawn(ffmpegPath, gpu.testArgs, { 
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 10000 // 10 second timeout
        });
        
        let stderr = '';
        testProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        testProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`${gpu.name} test failed: ${stderr}`));
          }
        });
        
        testProcess.on('error', reject);
        
        // Timeout fallback
        setTimeout(() => {
          testProcess.kill();
          reject(new Error(`${gpu.name} test timeout`));
        }, 10000);
      });
      
      // If we get here, the GPU encoder works
      gpuConfig = {
        available: true,
        type: gpu.type,
        encoder: gpu.encoder,
        hwaccel: gpu.hwaccel,
        preset: gpu.preset,
        name: gpu.name
      };
      
      console.log(`✅ GPU acceleration available: ${gpu.name}`);
      console.log(`   Encoder: ${gpu.encoder}`);
      console.log(`   Hardware acceleration: ${gpu.hwaccel || 'N/A'}`);
      return; // Use the first working GPU
      
    } catch (error) {
      console.log(`   ❌ ${gpu.name} not available: ${error.message.split('\n')[0]}`);
    }
  }
  
  console.log('⚠️  No GPU acceleration available, using CPU encoding');
  console.log('   Encoder: libx264 (CPU)');
}

// ===== LOCAL FFMPEG DETECTION =====
// This application ONLY uses your local FFmpeg installation
// No browser-based or cloud FFmpeg packages are used
let ffmpegPath = 'ffmpeg'; // Default system path

try {
  // Step 1: Try to find FFmpeg in system PATH
  const result = execSync('which ffmpeg || where ffmpeg', { encoding: 'utf8' });
  if (result.trim()) {
    ffmpegPath = result.trim().split('\n')[0]; // Use first result
    console.log(`✅ FFmpeg found at: ${ffmpegPath}`);
  }
} catch (error) {
  console.log('⚠️  FFmpeg not found in system PATH. Please install FFmpeg or set FFMPEG_PATH environment variable.');
  console.log('   macOS: brew install ffmpeg');
  console.log('   Windows: Download from https://ffmpeg.org/download.html');
  console.log('   Linux: sudo apt install ffmpeg');
}

// Step 2: Allow custom FFmpeg path via environment variable
if (process.env.FFMPEG_PATH) {
  ffmpegPath = process.env.FFMPEG_PATH;
  console.log(`🔧 Using custom FFmpeg path: ${ffmpegPath}`);
}

// Verify FFmpeg is accessible
try {
  execSync(`"${ffmpegPath}" -version`, { encoding: 'utf8', stdio: 'pipe' });
  console.log(`🎬 FFmpeg is ready for video processing`);
  
  // Detect GPU capabilities after FFmpeg is verified
  detectGPUCapabilities().catch(error => {
    console.error('Error detecting GPU capabilities:', error.message);
    console.log('⚠️  Falling back to CPU encoding');
  });
} catch (error) {
  console.error(`❌ FFmpeg not accessible at: ${ffmpegPath}`);
  console.error('Please check your FFmpeg installation or set FFMPEG_PATH environment variable');
}

// Middleware
app.use(cors());
app.use(express.json());

// ===== ORGANIZED DIRECTORY STRUCTURE =====
// Create separate directories for better file organization
const uploadsDir = path.join(__dirname, 'uploads');
const subtitlesDir = path.join(__dirname, 'subtitles');
const tempDir = path.join(__dirname, 'temp');
const processedDir = path.join(__dirname, 'processed');

console.log('📁 Creating directory structure:');
[uploadsDir, subtitlesDir, tempDir, processedDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`   Created: ${path.basename(dir)}/`);
  } else {
    console.log(`   Exists: ${path.basename(dir)}/`);
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'script') {
      cb(null, file.mimetype === 'text/plain');
    } else if (file.fieldname === 'video') {
      // Accept all video formats regardless of case
      const isVideo = file.mimetype.startsWith('video/') || 
                     file.originalname.match(/\.(mp4|mov|avi|mkv|webm|flv|wmv|m4v|3gp)$/i);
      cb(null, isVideo);
    } else {
      cb(new Error('Invalid field name'));
    }
  }
});

// Global progress tracking
global.processingProgress = {};
global.processingResults = {};

// Helper function to parse script into subtitles
function parseScript(scriptContent, options = {}) {
  const {
    baseDuration = 3,
    wordDuration = 0.3,
    splitMode = 'line'
  } = options;

  const lines = scriptContent.split('\n').filter(line => line.trim());
  const subtitles = [];
  let currentTime = 0;

  lines.forEach((line, index) => {
    const text = line.trim();
    if (!text) return;

    const wordCount = text.split(/\s+/).length;
    const duration = baseDuration + (wordCount * wordDuration);

    subtitles.push({
      id: index + 1,
      text: text,
      start: currentTime,
      end: currentTime + duration,
      duration: duration
    });

    currentTime += duration;
  });

  return subtitles;
}

// Helper function to generate SRT content
function generateSRT(subtitles) {
  return subtitles.map(sub => {
    const startTime = formatTime(sub.start);
    const endTime = formatTime(sub.end);
    return `${sub.id}\n${startTime} --> ${endTime}\n${sub.text}\n`;
  }).join('\n');
}

// Helper function to format time for SRT
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// Helper function to format duration for display
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to convert hex color to BGR for FFmpeg
function hexToBGR(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Convert to BGR format for FFmpeg (format: &HBBGGRR&)
  return `&H${b.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${r.toString(16).padStart(2, '0').toUpperCase()}&`;
}

// Helper function to get alignment value for FFmpeg
function getAlignment(position) {
  switch(position) {
    case 'top': return '8'; // Top center
    case 'center': return '5'; // Middle center
    case 'bottom': 
    default: return '2'; // Bottom center
  }
}

// Helper function to safely delete file with retry
function safeDeleteFile(filePath, maxRetries = 3, delay = 1000) {
  return new Promise((resolve) => {
    let attempts = 0;
    
    const tryDelete = () => {
      attempts++;
      if (!fs.existsSync(filePath)) {
        resolve();
        return;
      }
      
      fs.unlink(filePath, (err) => {
        if (!err) {
          resolve();
        } else if (attempts < maxRetries) {
          console.log(`Retry ${attempts}/${maxRetries} deleting ${filePath}`);
          setTimeout(tryDelete, delay);
        } else {
          console.error(`Failed to delete ${filePath} after ${maxRetries} attempts:`, err.message);
          resolve(); // Don't fail the entire process
        }
      });
    };
    
    tryDelete();
  });
}

// Helper function to parse FFmpeg progress output
function parseFFmpegProgress(line) {
  const timeMatch = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = parseFloat(timeMatch[3]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

// Progress tracking endpoint
app.get('/api/progress/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const progress = global.processingProgress?.[jobId] || { progress: 0, status: 'Starting...' };
  console.log(`Progress request for job ${jobId}:`, progress);
  res.json(progress);
});

// Results endpoint
app.get('/api/result/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const result = global.processingResults?.[jobId];
  
  if (!result) {
    return res.status(404).json({ error: 'Result not found' });
  }
  
  res.json(result);
});

// Test progress endpoint for debugging
app.post('/api/test-progress/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const { progress, status } = req.body;
  
  if (!global.processingProgress) {
    global.processingProgress = {};
  }
  
  global.processingProgress[jobId] = { progress, status };
  console.log(`Test progress set for job ${jobId}:`, { progress, status });
  
  res.json({ success: true, jobId, progress, status });
});

// Main captioning endpoint
app.post('/api/caption', upload.fields([
  { name: 'script', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  const jobId = Date.now().toString();
  console.log(`Starting new job with ID: ${jobId}`);
  
  // Initialize progress tracking immediately
  if (!global.processingProgress) {
    global.processingProgress = {};
  }
  
  const updateProgress = (progress, status) => {
    global.processingProgress[jobId] = { progress, status };
    console.log(`Job ${jobId} - Progress ${progress}%: ${status}`);
  };
  
  try {
    updateProgress(5, 'Validating files...');
    
    const { script, video } = req.files;
    
    if (!script || !video) {
      return res.status(400).json({ error: 'Both script and video files are required' });
    }

    // Send immediate response with job ID
    res.json({
      success: true,
      jobId: jobId,
      message: 'Processing started'
    });

    // Continue processing in background
    processVideoInBackground(jobId, script[0], video[0], req.body, updateProgress);

  } catch (error) {
    console.error('Error starting video processing:', error);
    
    // Clean up progress tracking
    delete global.processingProgress[jobId];
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to start video processing',
        details: error.message 
      });
    }
  }

  // Background processing function
  async function processVideoInBackground(jobId, scriptFile, videoFile, options, updateProgress) {
    let scriptPath = scriptFile.path;
    let videoPath = videoFile.path;
    let srtPath = null;
    
    try {
      updateProgress(10, 'Parsing script...');

      // Parse options from request body with validation
      const processOptions = {
        baseDuration: Math.max(0.1, Math.min(10, parseFloat(options.baseDuration) || 3)),
        wordDuration: Math.max(0.1, Math.min(2, parseFloat(options.wordDuration) || 0.3)),
        splitMode: options.splitMode || 'line',
        fontColor: options.fontColor || '#EC4899',
        fontWeight: options.fontWeight || 'bold',
        fontSize: Math.max(12, Math.min(48, parseInt(options.fontSize) || 24)),
        position: ['top', 'center', 'bottom'].includes(options.position) ? options.position : 'bottom'
      };

      updateProgress(15, 'Parsing script...');

      // Read and parse script
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      const subtitles = parseScript(scriptContent, processOptions);
      
      if (subtitles.length === 0) {
        throw new Error('No valid subtitles found in script');
      }
      
      updateProgress(20, 'Analyzing video...');
      
      // Get video duration and dimensions
      const videoInfo = await new Promise((resolve, reject) => {
        
        console.log(`🔍 Attempting to use FFprobe at: ${ffprobePath}`);
        console.log(`📹 Analyzing video file: ${videoPath}`);
        
        const ffprobeArgs = [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          '-i', videoPath
        ];
        
        console.log(`🎬 FFprobe command: ${ffprobePath} ${ffprobeArgs.join(' ')}`);
        
        const ffprobe = spawn(ffmpegPath, ffprobeArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
        
        let output = '';
        ffprobe.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        ffprobe.on('close', (code) => {
          if (code !== 0) {
            return reject(new Error('FFprobe failed to analyze video'));
          }
          
          try {
            const info = JSON.parse(output);
            const videoStream = info.streams.find(stream => stream.codec_type === 'video');
            
            if (!videoStream) {
              return reject(new Error('No video stream found'));
            }
            
            const duration = parseFloat(info.format.duration);
            const width = parseInt(videoStream.width);
            const height = parseInt(videoStream.height);
            
            if (!duration || !width || !height) {
              return reject(new Error('Could not extract video properties'));
            }
            
            resolve({ 
              format: { duration },
              streams: [{ width, height }]
            });
          } catch (parseError) {
            reject(new Error('Failed to parse video information: ' + parseError.message));
          }
        });
        
        ffprobe.on('error', reject);
      });

      const videoDuration = videoInfo.format.duration;
      const videoWidth = videoInfo.streams[0].width;
      const videoHeight = videoInfo.streams[0].height;
      const subtitlesDuration = subtitles[subtitles.length - 1].end;
      const totalDuration = Math.max(videoDuration, subtitlesDuration);
      
      console.log(`Video: ${videoWidth}x${videoHeight}, Duration: ${videoDuration}s, Subtitles: ${subtitlesDuration}s, Total: ${totalDuration}s`);
      
      updateProgress(30, 'Generating subtitles...');
      
      // Generate SRT file in subtitlesDir
      const srtContent = generateSRT(subtitles);
      srtPath = path.join(subtitlesDir, `script-${Date.now()}.srt`);
      fs.writeFileSync(srtPath, srtContent);

      updateProgress(35, 'Creating preview...');

      // Generate output filename in processedDir
      const outputFilename = `captioned-${Date.now()}.mp4`;
      const outputPath = path.join(processedDir, outputFilename);
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      updateProgress(40, 'Creating preview...');

      // Generate preview GIF filename in tempDir
      const previewFilename = `preview-${Date.now()}.gif`;
      const previewPath = path.join(tempDir, previewFilename);

      // Create preview GIF (first 3 seconds)
      await new Promise((resolve, reject) => {
        const palettePath = path.join(tempDir, `palette-${Date.now()}.png`);
        
        // First generate palette
        const paletteArgs = ['-y', '-t', '3', '-i', videoPath, '-vf', 'fps=10,scale=320:-1:flags=lanczos,palettegen', palettePath];
        const paletteProcess = spawn(ffmpegPath, paletteArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
        
        paletteProcess.on('close', (code) => {
          if (code !== 0) {
            return reject(new Error('Failed to generate palette for preview'));
          }
          
          // Then create GIF using palette
          const gifArgs = ['-y', '-t', '3', '-i', videoPath, '-i', palettePath, '-filter_complex', 'fps=10,scale=320:-1:flags=lanczos[x];[x][1:v]paletteuse', previewPath];
          const gifProcess = spawn(ffmpegPath, gifArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
          
          gifProcess.on('close', async (code) => {
            await safeDeleteFile(palettePath);
            if (code !== 0) {
              return reject(new Error('Failed to create preview GIF'));
            }
            resolve();
          });
          
          gifProcess.on('error', reject);
        });
        
        paletteProcess.on('error', reject);
      });

      updateProgress(50, 'Creating preview...');
      
      updateProgress(55, 'Processing video with captions...');

      // Build subtitle styling
      const bgrColor = hexToBGR(processOptions.fontColor);
      const alignment = getAlignment(processOptions.position);
      const boldValue = processOptions.fontWeight === 'bold' ? '1' : '0';
      
      // Escape the SRT path for FFmpeg
      const srtPathEscaped = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
      
      const subtitleStyle = `FontName=Arial,FontSize=${processOptions.fontSize},PrimaryColour=${bgrColor},Bold=${boldValue},Alignment=${alignment}`;

      // Build encoding arguments based on GPU availability
      const getEncodingArgs = () => {
        const baseArgs = [
          '-c:v', gpuConfig.encoder,
          '-pix_fmt', 'yuv420p'
        ];
        
        if (gpuConfig.available) {
          console.log(`🚀 Using GPU acceleration: ${gpuConfig.name}`);
          
          // Add hardware acceleration if available
          const hwaccelArgs = gpuConfig.hwaccel ? ['-hwaccel', gpuConfig.hwaccel] : [];
          
          // GPU-specific encoding settings
          switch (gpuConfig.type) {
            case 'nvidia':
              return [
                ...hwaccelArgs,
                ...baseArgs,
                '-preset', gpuConfig.preset,
                '-rc', 'vbr',
                '-cq', '23',
                '-b:v', '0'
              ];
            case 'intel':
              return [
                ...hwaccelArgs,
                ...baseArgs,
                '-preset', gpuConfig.preset,
                '-global_quality', '23'
              ];
            case 'amd':
              return [
                ...baseArgs,
                '-quality', gpuConfig.preset,
                '-rc', 'cqp',
                '-qp_i', '23',
                '-qp_p', '23'
              ];
            default:
              return [...baseArgs, '-crf', '23'];
          }
        } else {
          console.log('🔧 Using CPU encoding: libx264');
          return [
            ...baseArgs,
            '-preset', 'medium',
            '-crf', '23'
          ];
        }
      };
      // Process main video with captions using spawn for real-time progress
      await new Promise((resolve, reject) => {
        let ffmpegArgs;
        const encodingArgs = getEncodingArgs();
        
        if (subtitlesDuration > videoDuration) {
          // Add black padding with EXACT original video dimensions - apply subtitles FIRST, then concatenate
          const paddingDuration = subtitlesDuration - videoDuration;
          console.log(`Adding ${paddingDuration}s of black padding (${videoWidth}x${videoHeight}) to video`);
          
          // Apply subtitles to original video first, then concatenate with black padding using EXACT dimensions
          const filterComplex = `[0:v]subtitles='${srtPathEscaped}':force_style='${subtitleStyle}'[withSubtitles];color=black:size=${videoWidth}x${videoHeight}:duration=${paddingDuration}:rate=30[padding];[withSubtitles][padding]concat=n=2:v=1:a=0[final]`;
          
          ffmpegArgs = [
            '-y',
            ...(gpuConfig.hwaccel ? ['-hwaccel', gpuConfig.hwaccel] : []),
            '-i', videoPath,
            '-filter_complex', filterComplex,
            '-map', '[final]',
            '-c:v', 'libx264',
            ...encodingArgs,
            outputPath
          ];
        } else {
          // No padding needed - just add subtitles with NO scaling whatsoever
          const videoFilter = `subtitles='${srtPathEscaped}':force_style='${subtitleStyle}'`;
          
          ffmpegArgs = [
            '-y',
            ...(gpuConfig.hwaccel ? ['-hwaccel', gpuConfig.hwaccel] : []),
            '-i', videoPath,
            '-vf', videoFilter,
            ...encodingArgs,
            '-c:a', 'copy',
            '-progress', 'pipe:2',
            outputPath
          ];
        }
        
        console.log(`🎬 Processing with ${gpuConfig.available ? gpuConfig.name : 'CPU'} encoding`);
        console.log('FFmpeg command:', ffmpegArgs.join(' '));
        
        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
        
        let stderrOutput = '';
        
        ffmpegProcess.stderr.on('data', (data) => {
          const output = data.toString();
          stderrOutput += output;
          
          // Parse progress from FFmpeg output
          const lines = output.split('\n');
          for (const line of lines) {
            const currentTime = parseFFmpegProgress(line);
            if (currentTime !== null) {
              // Map FFmpeg progress to 55-95% range (40% of total progress)
              const ffmpegProgress = Math.min(1, currentTime / totalDuration);
              const progressPercent = Math.min(95, 55 + (ffmpegProgress * 40));
              updateProgress(Math.round(progressPercent), 'Processing video with captions...');
            }
          }
        });
        
        ffmpegProcess.on('close', async (code) => {
          if (code !== 0) {
            console.error('FFmpeg error:', stderrOutput);
            return reject(new Error('Failed to process video: ' + stderrOutput));
          }
          
          updateProgress(98, 'Cleaning up temporary files...');
          
          // Clean up temp files with safe deletion
          await Promise.all([
            safeDeleteFile(scriptPath),
            safeDeleteFile(videoPath),
            safeDeleteFile(srtPath)
          ]);
          
          resolve();
        });
        
        ffmpegProcess.on('error', (err) => {
          reject(new Error('FFmpeg process error: ' + err.message));
        });
      });

      updateProgress(100, 'Processing complete!');

      // Store final results
      const result = {
        success: true,
        jobId: jobId,
        duration: formatDuration(totalDuration),
        durationSeconds: totalDuration,
        subtitlesCount: subtitles.length,
        previewUrl: `/temp/${previewFilename}`,
        downloadUrl: `/download/${outputFilename}`,
        subtitles: subtitles
      };

      global.processingResults[jobId] = result;

      // Clean up progress tracking after a delay
      setTimeout(() => {
        delete global.processingProgress[jobId];
        delete global.processingResults[jobId];
      }, 300000); // Clean up after 5 minutes

    } catch (error) {
      console.error('Error processing video in background:', error);
      
      // Clean up temp files on error
      await Promise.all([
        safeDeleteFile(scriptPath),
        safeDeleteFile(videoPath),
        safeDeleteFile(srtPath)
      ]);
      
      // Store error result
      global.processingResults[jobId] = {
        success: false,
        error: 'Video processing failed. Please check your files and try again.',
        details: error.message
      };
      
      // Update progress to show error
      updateProgress(0, 'Processing failed');
      
      // Clean up progress tracking
      setTimeout(() => {
        delete global.processingProgress[jobId];
        delete global.processingResults[jobId];
      }, 60000);
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    ffmpegPath: ffmpegPath,
    gpu: {
      available: gpuConfig.available,
      type: gpuConfig.type,
      encoder: gpuConfig.encoder,
      name: gpuConfig.name || 'CPU (libx264)'
    }
  });
});

// Force download endpoint for processed videos
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(processedDir, filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Force download with proper headers
  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Download error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    }
  });
});

// Serve static files for preview and temp files
app.use('/temp', express.static(tempDir));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Growloom Captioner server running on port ${PORT}`);
  console.log(`🔧 Using FFmpeg at: ${ffmpegPath}`);
  console.log(`⚡ Encoding: ${gpuConfig.available ? `${gpuConfig.name} (${gpuConfig.encoder})` : 'CPU (libx264)'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📁 File structure: uploads/ | subtitles/ | temp/ | processed/`);
  console.log(`🎬 Ready to process videos with captions!`);
});