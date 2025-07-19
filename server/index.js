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
app.post('/api/caption', upload.any(), async (req, res) => {
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
    
    const files = req.files;
    const processingMode = req.body.processingMode || 'single';
    
    if (processingMode === 'single') {
      const script = files.find(f => f.fieldname === 'script');
      const video = files.find(f => f.fieldname === 'video');
      
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
      processVideoInBackground(jobId, script, video, req.body, updateProgress);
    } else {
      // Batch processing
      const batchCount = parseInt(req.body.batchCount);
      const scripts = [];
      const videos = [];
      
      for (let i = 0; i < batchCount; i++) {
        const script = files.find(f => f.fieldname === `script_${i}`);
        const video = files.find(f => f.fieldname === `video_${i}`);
        
        if (!script || !video) {
          return res.status(400).json({ error: `Missing script or video file for pair ${i + 1}` });
        }
        
        scripts.push(script);
        videos.push(video);
      }
      
      // Send immediate response with job ID
      res.json({
        success: true,
        jobId: jobId,
        message: 'Batch processing started'
      });
      
      // Continue batch processing in background
      processBatchInBackground(jobId, scripts, videos, req.body, updateProgress);
    }

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

  // Batch processing function
  async function processBatchInBackground(jobId, scripts, videos, options, updateProgress) {
    const results = [];
    const totalPairs = scripts.length;
    
    try {
      updateProgress(5, `Starting batch processing of ${totalPairs} video pairs...`);
      
      for (let i = 0; i < totalPairs; i++) {
        const pairProgress = (i / totalPairs) * 90; // Reserve 10% for final steps
        updateProgress(Math.round(5 + pairProgress), `Processing pair ${i + 1}/${totalPairs}...`);
        
        try {
          // Process each pair individually
          const result = await processSingleVideo(scripts[i], videos[i], options, (progress, status) => {
            const adjustedProgress = 5 + pairProgress + (progress / totalPairs * 0.9);
            updateProgress(Math.round(adjustedProgress), `Pair ${i + 1}/${totalPairs}: ${status}`);
          });
          
          results.push({
            index: i,
            scriptName: scripts[i].originalname,
            videoName: videos[i].originalname,
            ...result
          });
        } catch (error) {
          console.error(`Error processing pair ${i + 1}:`, error);
          results.push({
            index: i,
            scriptName: scripts[i].originalname,
            videoName: videos[i].originalname,
            success: false,
            error: error.message
          });
        }
      }
      
      updateProgress(100, 'Batch processing complete!');
      
      // Store batch results
      global.processingResults[jobId] = {
        success: true,
        jobId: jobId,
        batchMode: true,
        totalPairs: totalPairs,
        results: results,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      };
      
    } catch (error) {
      console.error('Error in batch processing:', error);
      global.processingResults[jobId] = {
        success: false,
        batchMode: true,
        error: 'Batch processing failed',
        details: error.message
      };
    }
    
    // Clean up progress tracking after delay
    setTimeout(() => {
      delete global.processingProgress[jobId];
      delete global.processingResults[jobId];
    }, 300000);
  }

  // Extract single video processing logic
  async function processSingleVideo(scriptFile, videoFile, options, updateProgress) {
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

      // Read and parse script
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      const subtitles = parseScript(scriptContent, processOptions);
      
      if (subtitles.length === 0) {
        throw new Error('No valid subtitles found in script');
      }
      
      updateProgress(20, 'Analyzing video...');
      
      // Get video duration and dimensions using the fixed ffprobe logic
      const videoInfo = await new Promise((resolve, reject) => {
        let ffprobePath = 'ffprobe';
        try {
          const result = execSync('which ffprobe || where ffprobe', { encoding: 'utf8' });
          if (result.trim()) {
            ffprobePath = result.trim().split('\n')[0];
          }
        } catch (error) {
          console.log('⚠️  FFprobe not found in system PATH.');
        }
        if (process.env.FFPROBE_PATH) {
          ffprobePath = process.env.FFPROBE_PATH;
        }
        
        const ffprobeArgs = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', videoPath];
        const ffprobe = spawn(ffprobePath, ffprobeArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
        
        let output = '';
        let errorOutput = '';
        
        ffprobe.stdout.on('data', (data) => { output += data.toString(); });
        ffprobe.stderr.on('data', (data) => { errorOutput += data.toString(); });
        
        ffprobe.on('close', (code) => {
          if (code !== 0) {
            return reject(new Error('FFprobe failed: ' + errorOutput));
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
            
            resolve({ format: { duration }, streams: [{ width, height }] });
          } catch (parseError) {
            reject(new Error('Failed to parse video info: ' + parseError.message));
          }
        });
        
        ffprobe.on('error', reject);
      });

      const videoDuration = videoInfo.format.duration;
      const videoWidth = videoInfo.streams[0].width;
      const videoHeight = videoInfo.streams[0].height;
      const subtitlesDuration = subtitles[subtitles.length - 1].end;
      
      // *** KEY CHANGE: Only process the overlapping duration ***
      const processingDuration = Math.min(videoDuration, subtitlesDuration);
      
      console.log(`Video: ${videoWidth}x${videoHeight}, Duration: ${videoDuration}s, Subtitles: ${subtitlesDuration}s, Processing: ${processingDuration}s`);
      
      updateProgress(30, 'Generating subtitles...');
      
      // Filter subtitles to only include those within processing duration
      const filteredSubtitles = subtitles.filter(sub => sub.start < processingDuration);
      
      // Adjust end times of subtitles that extend beyond processing duration
      filteredSubtitles.forEach(sub => {
        if (sub.end > processingDuration) {
          sub.end = processingDuration;
          sub.duration = sub.end - sub.start;
        }
      });
      
      // Generate SRT file
      const srtContent = generateSRT(filteredSubtitles);
      srtPath = path.join(subtitlesDir, `script-${Date.now()}.srt`);
      fs.writeFileSync(srtPath, srtContent);

      updateProgress(40, 'Creating preview...');

      // Generate output filename
      const outputFilename = `captioned-${Date.now()}.mp4`;
      const outputPath = path.join(processedDir, outputFilename);
      
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }

      // Generate preview GIF
      const previewFilename = `preview-${Date.now()}.gif`;
      const previewPath = path.join(tempDir, previewFilename);

      await new Promise((resolve, reject) => {
        const palettePath = path.join(tempDir, `palette-${Date.now()}.png`);
        const previewDuration = Math.min(3, processingDuration);
        
        const paletteArgs = ['-y', '-t', previewDuration.toString(), '-i', videoPath, '-vf', 'fps=10,scale=320:-1:flags=lanczos,palettegen', palettePath];
        const paletteProcess = spawn(ffmpegPath, paletteArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
        
        paletteProcess.on('close', (code) => {
          if (code !== 0) {
            return reject(new Error('Failed to generate palette'));
          }
          
          const gifArgs = ['-y', '-t', previewDuration.toString(), '-i', videoPath, '-i', palettePath, '-filter_complex', 'fps=10,scale=320:-1:flags=lanczos[x];[x][1:v]paletteuse', previewPath];
          const gifProcess = spawn(ffmpegPath, gifArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
          
          gifProcess.on('close', async (code) => {
            await safeDeleteFile(palettePath);
            if (code !== 0) {
              return reject(new Error('Failed to create preview'));
            }
            resolve();
          });
          
          gifProcess.on('error', reject);
        });
        
        paletteProcess.on('error', reject);
      });

      updateProgress(55, 'Processing video with captions...');

      // Build subtitle styling
      const bgrColor = hexToBGR(processOptions.fontColor);
      const alignment = getAlignment(processOptions.position);
      const boldValue = processOptions.fontWeight === 'bold' ? '1' : '0';
      const srtPathEscaped = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
      const subtitleStyle = `FontName=Arial,FontSize=${processOptions.fontSize},PrimaryColour=${bgrColor},Bold=${boldValue},Alignment=${alignment}`;

      // Process video with captions - ONLY for the overlapping duration
      await new Promise((resolve, reject) => {
        const ffmpegArgs = [
          '-y',
          '-i', videoPath,
          '-t', processingDuration.toString(), // *** KEY: Limit to overlapping duration ***
          '-vf', `subtitles='${srtPathEscaped}':force_style='${subtitleStyle}'`,
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-preset', 'medium',
          '-crf', '23',
          '-c:a', 'copy',
          '-progress', 'pipe:2',
          outputPath
        ];
        
        console.log('Processing with overlap duration:', processingDuration, 'seconds');
        console.log('FFmpeg args:', ffmpegArgs.join(' '));
        
        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
        
        let stderrOutput = '';
        
        ffmpegProcess.stderr.on('data', (data) => {
          const output = data.toString();
          stderrOutput += output;
          
          const lines = output.split('\n');
          for (const line of lines) {
            const currentTime = parseFFmpegProgress(line);
            if (currentTime !== null) {
              const ffmpegProgress = Math.min(1, currentTime / processingDuration);
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
          
          updateProgress(98, 'Cleaning up...');
          
          await Promise.all([
            safeDeleteFile(scriptPath),
            safeDeleteFile(videoPath),
            safeDeleteFile(srtPath)
          ]);
          
          resolve();
        });
        
        ffmpegProcess.on('error', reject);
      });

      updateProgress(100, 'Complete!');

      return {
        success: true,
        duration: formatDuration(processingDuration),
        durationSeconds: processingDuration,
        subtitlesCount: filteredSubtitles.length,
        previewUrl: `/temp/${previewFilename}`,
        downloadUrl: `/download/${outputFilename}`,
        subtitles: filteredSubtitles
      };

    } catch (error) {
      console.error('Error processing single video:', error);
      
      await Promise.all([
        safeDeleteFile(scriptPath),
        safeDeleteFile(videoPath),
        safeDeleteFile(srtPath)
      ]);
      
      throw error;
    }
  }

  // Background processing function
  async function processVideoInBackground(jobId, scriptFile, videoFile, options, updateProgress) {
    try {
      const result = await processSingleVideo(scriptFile, videoFile, options, updateProgress);
      global.processingResults[jobId] = result;
    } catch (error) {
      console.error('Error processing video in background:', error);
      global.processingResults[jobId] = {
        success: false,
        error: 'Video processing failed',
        details: error.message
      };
    }
    
    // Clean up progress tracking
    setTimeout(() => {
      delete global.processingProgress[jobId];
      delete global.processingResults[jobId];
    }, 300000);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    ffmpegPath: ffmpegPath
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
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📁 File structure: uploads/ | subtitles/ | temp/ | processed/`);
  console.log(`🎬 Ready to process videos with captions!`);
});