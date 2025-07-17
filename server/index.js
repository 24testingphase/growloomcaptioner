import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { exec } from 'child_process';

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== ORGANIZED DIRECTORY STRUCTURE =====
// Create separate directories for better file organization
const uploadsDir = path.join(__dirname, 'uploads');
const srtDir = path.join(__dirname, 'subtitles');
const tempDir = path.join(__dirname, 'temp');
const processedDir = path.join(__dirname, 'processed');
[uploadsDir, srtDir, tempDir, processedDir].forEach(dir => {
console.log('📁 Creating directory structure:');
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

// Progress tracking endpoint
app.get('/api/progress/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const progress = global.processingProgress?.[jobId] || { progress: 0, status: 'Starting...' };
  res.json(progress);
});

// Main captioning endpoint
app.post('/api/caption', upload.fields([
  { name: 'script', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  const jobId = Date.now().toString();
  let scriptPath = null;
  let videoPath = null;
  let srtPath = null;
  
  // Initialize global progress tracking
  if (!global.processingProgress) {
    global.processingProgress = {};
  }
  
  const updateProgress = (progress, status) => {
    global.processingProgress[jobId] = { progress, status };
    console.log(`Progress ${progress}%: ${status}`);
  };
  
  try {
    updateProgress(5, 'Validating files...');
    
    const { script, video } = req.files;
    
    if (!script || !video) {
      return res.status(400).json({ error: 'Both script and video files are required' });
    }

    scriptPath = script[0].path;
    videoPath = video[0].path;

    updateProgress(10, 'Parsing options...');

    // Parse options from request body with validation
    const options = {
      baseDuration: Math.max(0.1, Math.min(10, parseFloat(req.body.baseDuration) || 3)),
      wordDuration: Math.max(0.1, Math.min(2, parseFloat(req.body.wordDuration) || 0.3)),
      splitMode: req.body.splitMode || 'line',
      fontColor: req.body.fontColor || '#EC4899',
      fontWeight: req.body.fontWeight || 'bold',
      fontSize: Math.max(12, Math.min(48, parseInt(req.body.fontSize) || 24)),
      position: ['top', 'center', 'bottom'].includes(req.body.position) ? req.body.position : 'bottom'
    };

    updateProgress(15, 'Reading script content...');

    // Read and parse script
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    const subtitles = parseScript(scriptContent, options);
    
    if (subtitles.length === 0) {
      return res.status(400).json({ error: 'No valid subtitles found in script' });
    }
    
    updateProgress(20, 'Analyzing video duration...');
    
    // Get video duration first
    const videoInfo = await new Promise((resolve, reject) => {
      const ffprobeCmd = `"${ffmpegPath}" -i "${videoPath}" -hide_banner 2>&1`;
      exec(ffprobeCmd, (err, stdout, stderr) => {
        const match = stdout.match(/Duration: (\d+):(\d+):(\d+\.?\d*)/);
        if (!match) return reject(new Error('Could not parse video duration'));
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = parseFloat(match[3]);
        const duration = hours * 3600 + minutes * 60 + seconds;
        resolve({ format: { duration } });
      });
    });

    const videoDuration = videoInfo.format.duration;
    const subtitlesDuration = subtitles[subtitles.length - 1].end;
    const totalDuration = Math.max(videoDuration, subtitlesDuration);
    
    console.log(`Video duration: ${videoDuration}s, Subtitles duration: ${subtitlesDuration}s, Total: ${totalDuration}s`);
    
    updateProgress(25, 'Generating subtitle file...');
    
    // Generate SRT file in srtDir
    const srtContent = generateSRT(subtitles);
    srtPath = path.join(srtDir, `script-${Date.now()}.srt`);
    fs.writeFileSync(srtPath, srtContent);

    updateProgress(30, 'Preparing output paths...');

    // Generate output filename in processedDir
    const outputFilename = `captioned-${Date.now()}.mp4`;
    const outputPath = path.join(processedDir, outputFilename);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    updateProgress(35, 'Creating video preview...');

    // Generate preview GIF filename in tempDir
    const previewFilename = `preview-${Date.now()}.gif`;
    const previewPath = path.join(tempDir, previewFilename);

    // Create preview GIF (first 3 seconds)
    await new Promise((resolve, reject) => {
      const palettePath = path.join(tempDir, `palette-${Date.now()}.png`);
      const gifCmd = `"${ffmpegPath}" -y -t 3 -i "${videoPath}" -vf "fps=10,scale=320:-1:flags=lanczos,palettegen" "${palettePath}" && ` +
        `"${ffmpegPath}" -y -t 3 -i "${videoPath}" -i "${palettePath}" -filter_complex "fps=10,scale=320:-1:flags=lanczos[x];[x][1:v]paletteuse" "${previewPath}"`;
      
      exec(gifCmd, async (err, stdout, stderr) => {
        await safeDeleteFile(palettePath);
        if (err) return reject(new Error('Failed to create preview GIF: ' + stderr));
        resolve();
      });
    });

    updateProgress(50, 'Processing video with captions...');

    // Build subtitle styling
    const bgrColor = hexToBGR(options.fontColor);
    const alignment = getAlignment(options.position);
    const boldValue = options.fontWeight === 'bold' ? '1' : '0';
    
    // Escape the SRT path for Windows
    const srtPathEscaped = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    
    const subtitleStyle = `FontName=Arial,FontSize=${options.fontSize},PrimaryColour=${bgrColor},Bold=${boldValue},Alignment=${alignment}`;
    const subtitleFilter = `subtitles='${srtPathEscaped}':force_style='${subtitleStyle}'`;

    // Process main video with captions
    await new Promise((resolve, reject) => {
      let ffmpegCmd;
      
      if (subtitlesDuration > videoDuration) {
        // Pad with black frames
        const paddingDuration = subtitlesDuration - videoDuration;
        console.log(`Adding ${paddingDuration}s of black padding to video`);
        
        const filterComplex = `[0:v]scale=1920:1080,${subtitleFilter}[subtitled];color=black:size=1920x1080:duration=${paddingDuration}:rate=30[padding];[subtitled][padding]concat=n=2:v=1:a=0[final]`;
        ffmpegCmd = `"${ffmpegPath}" -y -i "${videoPath}" -filter_complex "${filterComplex}" -map "[final]" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 23 "${outputPath}"`;
      } else {
        const videoFilter = `scale=1920:1080,${subtitleFilter}`;
        ffmpegCmd = `"${ffmpegPath}" -y -i "${videoPath}" -vf "${videoFilter}" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 23 -c:a copy "${outputPath}"`;
      }
      
      console.log('Running FFmpeg command:', ffmpegCmd);
      
      const startTime = Date.now();
      const estimatedTime = Math.max(30, totalDuration * 2); // Estimate 2x video duration minimum 30s
      
      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progressPercent = Math.min(90, 50 + (elapsed / estimatedTime) * 40);
        updateProgress(Math.round(progressPercent), 'Processing video with captions...');
      }, 2000);
      
      exec(ffmpegCmd, async (err, stdout, stderr) => {
        clearInterval(progressInterval);
        
        if (err) {
          console.error('FFmpeg error:', stderr);
          return reject(new Error('Failed to process video: ' + stderr));
        }
        
        updateProgress(95, 'Cleaning up temporary files...');
        
        // Clean up temp files with safe deletion
        await Promise.all([
          safeDeleteFile(scriptPath),
          safeDeleteFile(videoPath),
          safeDeleteFile(srtPath)
        ]);
        
        resolve();
      });
    });

    updateProgress(100, 'Processing complete!');

    // Clean up progress tracking after a delay
    setTimeout(() => {
      delete global.processingProgress[jobId];
    }, 60000); // Clean up after 1 minute

    // Return response
    res.json({
      success: true,
      jobId: jobId,
      duration: formatDuration(totalDuration),
      durationSeconds: totalDuration,
      subtitlesCount: subtitles.length,
      previewUrl: `/temp/${previewFilename}`,
      downloadUrl: `/processed/${outputFilename}`,
      subtitles: subtitles
    });

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Clean up temp files on error
    await Promise.all([
      safeDeleteFile(scriptPath),
      safeDeleteFile(videoPath),
      safeDeleteFile(srtPath)
    ]);
    
    // Clean up progress tracking
    delete global.processingProgress[jobId];
    
    res.status(500).json({ 
      error: 'Video processing failed. Please check your files and try again.',
      details: error.message 
    });
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

// Serve new static folders
app.use('/subtitles', express.static(srtDir));
app.use('/temp', express.static(tempDir));
app.use('/processed', express.static(processedDir));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Growloom Captioner server running on port ${PORT}`);
  console.log(`🔧 Using FFmpeg at: ${ffmpegPath}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📁 File structure: uploads/ | subtitles/ | temp/ | processed/`);
  console.log(`🎬 Ready to process videos with captions!`);
});