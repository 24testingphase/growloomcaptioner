import express from 'express';
import multer from 'multer';
import cors from 'cors';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

// Main captioning endpoint
app.post('/api/caption', upload.fields([
  { name: 'script', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  let scriptPath = null;
  let videoPath = null;
  let srtPath = null;
  
  try {
    const { script, video } = req.files;
    
    if (!script || !video) {
      return res.status(400).json({ error: 'Both script and video files are required' });
    }

    scriptPath = script[0].path;
    videoPath = video[0].path;

    // Parse options from request body
    const options = {
      baseDuration: parseFloat(req.body.baseDuration) || 3,
      wordDuration: parseFloat(req.body.wordDuration) || 0.3,
      splitMode: req.body.splitMode || 'line',
      fontColor: req.body.fontColor || '#EC4899',
      fontWeight: req.body.fontWeight || 'bold',
      fontSize: parseInt(req.body.fontSize) || 24,
      position: req.body.position || 'bottom'
    };

    // Validate options
    if (isNaN(options.baseDuration) || options.baseDuration < 0.1 || options.baseDuration > 10) {
      return res.status(400).json({ error: 'Invalid base duration' });
    }
    if (isNaN(options.wordDuration) || options.wordDuration < 0.1 || options.wordDuration > 2) {
      return res.status(400).json({ error: 'Invalid word duration' });
    }
    if (!['top', 'center', 'bottom'].includes(options.position)) {
      return res.status(400).json({ error: 'Invalid position' });
    }

    // Read and parse script
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    const subtitles = parseScript(scriptContent, options);
    
    // Calculate total duration
    const totalDuration = subtitles.length > 0 ? subtitles[subtitles.length - 1].end : 0;
    
    // Generate SRT file
    const srtContent = generateSRT(subtitles);
    srtPath = path.join(uploadsDir, `subtitles-${Date.now()}.srt`);
    fs.writeFileSync(srtPath, srtContent);

    // Generate output filename
    const outputFilename = `captioned-${Date.now()}.mp4`;
    const outputPath = path.join(uploadsDir, outputFilename);

    // Generate preview GIF filename
    const previewFilename = `preview-${Date.now()}.gif`;
    const previewPath = path.join(uploadsDir, previewFilename);

    // Create preview GIF (first 3 seconds)
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .complexFilter([
          `[0:v]fps=10,scale=320:-1:flags=lanczos,split[s0][s1]`,
          `[s0]palettegen[p]`,
          `[s1][p]paletteuse`
        ])
        .duration(3)
        .output(previewPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Process main video with captions
    await new Promise((resolve, reject) => {
      let command = ffmpeg(videoPath);
      
      // Add subtitle filter based on position (top, center, bottom)
      let yPosition;
      switch(options.position) {
        case 'top':
          yPosition = '50';
          break;
        case 'center':
          yPosition = '(h-th)/2';
          break;
        case 'bottom':
        default:
          yPosition = 'h-th-50';
          break;
      }
      
      const subtitleFilter = `subtitles=${srtPath}:force_style='FontName=Arial,FontSize=${options.fontSize},PrimaryColour=&H${options.fontColor.replace('#', '')}&,Bold=${options.fontWeight === 'bold' ? '1' : '0'},Alignment=${options.position === 'top' ? '8' : '2'}'`;
      
      command
        .videoFilters(subtitleFilter)
        .output(outputPath)
        .on('progress', (progress) => {
          console.log(`Processing: ${progress.percent}% done`);
        })
        .on('end', () => {
          console.log('Video processing completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('Error processing video:', err);
          reject(err);
        })
        .run();
    });

    // Return response
    res.json({
      success: true,
      duration: formatDuration(totalDuration),
      durationSeconds: totalDuration,
      subtitlesCount: subtitles.length,
      previewUrl: `/uploads/${previewFilename}`,
      downloadUrl: `/uploads/${outputFilename}`,
      subtitles: subtitles
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    // Clean up temporary files
    try {
      if (scriptPath && fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
      if (videoPath && fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      if (srtPath && fs.existsSync(srtPath)) {
        fs.unlinkSync(srtPath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Growloom Captioner server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});