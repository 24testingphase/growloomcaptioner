# Growloom Captioner

A modern, full-stack web application for automatically generating and overlaying captions on videos using custom scripts. Built with React, Node.js, Express, and FFmpeg.

## 🎯 Local FFmpeg Processing Only

**Important**: This application uses ONLY your local FFmpeg installation via direct system calls. No browser-based FFmpeg, cloud processing, or external dependencies are used. Your videos are processed entirely on your machine for maximum privacy and control.

## Features

- **Drag & Drop Interface**: Upload script (.txt) and video files (.mp4/.mov) with ease
- **Real-time Processing**: Live progress tracking with actual processing status updates
- **Customizable Captions**: Adjust font size, color, position, and timing
- **Dynamic Duration Calculation**: Base duration + per-word timing (3s + 0.3s/word by default)
- **Preview Generation**: Automatic GIF preview of captioned content
- **Local Processing**: No cloud dependencies - runs entirely on your machine
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Multiple Video Formats**: Supports MP4, MOV, AVI, MKV, WEBM, FLV, WMV, M4V, 3GP (case-insensitive)
- **Multi-Step Interface**: Intuitive workflow with upload, customize, processing, and results steps
- **Smart Video Extension**: Automatically adds black padding if subtitles are longer than video
- **Robust File Handling**: Advanced cleanup and error handling for Windows/Mac/Linux compatibility

## Prerequisites

Before running the application, you need:

1. **Node.js** (v16 or higher)
2. **FFmpeg** - Required for local video processing

## FFmpeg Installation & Configuration

### GPU vs CPU Processing

**Current Implementation**: The application uses `libx264` (CPU-based) encoding for maximum compatibility across all systems. This ensures reliable processing regardless of your hardware configuration.

**GPU Acceleration (Advanced)**: If you have specific GPU hardware and want to enable GPU encoding, you can modify the FFmpeg arguments in `server/index.js`:

- **NVIDIA GPUs**: Replace `-c:v libx264` with `-c:v h264_nvenc` (requires NVENC support)
- **Intel GPUs**: Replace `-c:v libx264` with `-c:v h264_qsv` (requires Intel Quick Sync)
- **AMD GPUs**: Replace `-c:v libx264` with `-c:v h264_amf` (requires AMD AMF support)

**Note**: GPU encoding requires your FFmpeg build to include the specific GPU codec support. The current CPU-based approach provides the best compatibility and reliability.

### Step 1: Install FFmpeg

The application will automatically detect FFmpeg if it's installed in your system PATH. If you need to install it:

#### macOS
```bash
brew install ffmpeg
```

#### Windows
1. Download FFmpeg from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Extract to a folder (e.g., `C:\ffmpeg\`)
3. Add `C:\ffmpeg\bin\` to your PATH environment variable
4. Restart your command prompt/terminal

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

### Step 2: Verify Installation

Test FFmpeg is working:
```bash
ffmpeg -version
```

You should see FFmpeg version information. If not, FFmpeg is not in your PATH.

### Step 3: Custom FFmpeg Path (Optional)

If FFmpeg is installed in a custom location or not in your PATH, you can specify the exact path:

#### Method 1: Environment Variable (Recommended)
Create a `.env` file in the `server/` directory:
```env
FFMPEG_PATH=C:\path\to\your\ffmpeg.exe
# or on macOS/Linux:
# FFMPEG_PATH=/usr/local/bin/ffmpeg
```

#### Method 2: System Environment Variable
```bash
# Windows (Command Prompt)
set FFMPEG_PATH=C:\path\to\your\ffmpeg.exe

# Windows (PowerShell)
$env:FFMPEG_PATH="C:\path\to\your\ffmpeg.exe"

# macOS/Linux
export FFMPEG_PATH="/path/to/your/ffmpeg"
```

#### Method 3: Temporary (for testing)
You can also set it when starting the server:
```bash
FFMPEG_PATH="/custom/path/ffmpeg" npm run dev
```

### FFmpeg Detection Process

The application detects FFmpeg in this order:
1. **Custom Path**: Checks `FFMPEG_PATH` environment variable
2. **System PATH**: Searches for `ffmpeg` in your system PATH
3. **Error**: Shows installation instructions if not found

On startup, you'll see one of these messages:
- ✅ `FFmpeg found at: /usr/local/bin/ffmpeg` (auto-detected)
- 🔧 `Using custom FFmpeg path: /custom/path/ffmpeg` (custom path)
- ❌ `FFmpeg not accessible` (needs installation/configuration)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd growloom-captioner
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd server
npm install
cd ..
```

**Note**: The server dependencies are minimal and include only essential packages. No heavy video processing libraries are included since we use your local FFmpeg directly.

## Running the Application

### Development Mode

1. **Start the backend server** (in one terminal):
```bash
cd server
npm run dev
```
The server will run on `http://localhost:3001`

2. **Start the frontend development server** (in another terminal):
```bash
npm run dev
```
The frontend will run on `http://localhost:5173`

### Production Mode

1. **Build the frontend**:
```bash
npm run build
```

2. **Start the backend server**:
```bash
cd server
npm start
```

3. **Serve the frontend** (optional - you can use any static file server):
```bash
npm run preview
```

## Directory Structure

The application creates an organized file structure in the `server/` directory:

```
server/
├── uploads/          # Temporary uploaded files (auto-cleaned)
├── subtitles/        # Generated SRT subtitle files
├── temp/             # Preview GIFs and temporary processing files
├── processed/        # Final captioned videos ready for download
└── index.js          # Main server file
```

### Environment Configuration

Create a `.env` file in the `server/` directory for custom configuration:

```
# Custom FFmpeg path (if not in system PATH)
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe

# Server port (default: 3001)
PORT=3001
```

## API Endpoints

### POST /api/caption
Process a video with captions from a script.

**Request:**
- `script` (file): Plain text script file
- `video` (file): Video file (MP4/MOV)
- `baseDuration` (number): Base duration per subtitle (default: 3)
- `wordDuration` (number): Additional duration per word (default: 0.3)
- `fontColor` (string): Hex color code (default: #EC4899)
- `fontSize` (number): Font size in pixels (default: 24)
- `fontWeight` (string): Font weight (default: "bold")
- `position` (string): Caption position "top" or "bottom" (default: "bottom")

**Response:**
```json
{
  "success": true,
  "duration": "00:05:23",
  "durationSeconds": 323,
  "subtitlesCount": 45,
  "previewUrl": "/uploads/preview-123456.gif",
  "downloadUrl": "/uploads/captioned-123456.mp4",
  "subtitles": [...]
}
```

### GET /api/health
Health check endpoint.

## Default Caption Parameters

The application includes smart defaults and robust processing:

- **Base Duration**: 3 seconds per subtitle
- **Word Duration**: +0.3 seconds per word
- **Font Color**: Pink (#EC4899)
- **Font Size**: 24px
- **Font Weight**: Bold
- **Position**: Bottom of video
- **Split Mode**: One line per subtitle
- **Video Extension**: Automatic padding if subtitles exceed video length
- **Format Support**: All major video formats (MP4, MOV, AVI, MKV, WEBM, etc.)

## Customization

### Frontend Customization
- Edit `src/components/CustomizationPanel.tsx` to add new options
- Modify `src/App.tsx` to change default values
- Update styling in Tailwind CSS classes

### Backend Customization
- Edit `server/index.js` to modify processing logic
- Adjust FFmpeg parameters in the video processing pipeline
- Add new API endpoints for additional functionality

## File Structure

```
growloom-captioner/
├── src/
│   ├── components/
│   │   ├── DragDropZone.tsx
│   │   ├── CustomizationPanel.tsx
│   │   ├── ProgressIndicator.tsx
│   │   └── ResultsDisplay.tsx
│   ├── App.tsx
│   └── main.tsx
├── server/
│   ├── index.js
│   ├── package.json
│   └── uploads/ (created automatically)
├── README.md
└── package.json
```

## Troubleshooting

### Common Issues

1. **FFmpeg not found**: 
   - Verify installation: `ffmpeg -version`
   - Check PATH environment variable
   - Set `FFMPEG_PATH` in `.env` file for custom locations
   - Restart the server after installation

2. **FFmpeg permission errors**:
   - Ensure FFmpeg executable has proper permissions
   - On Windows, run as administrator if needed
   - Check antivirus software isn't blocking FFmpeg

3. **Port conflicts**: 
   - Change `PORT=3002` in `.env` file
   - Or modify the port in `server/index.js`

4. **File processing errors**:
   - Check video file format is supported
   - Ensure sufficient disk space in server directory
   - Verify FFmpeg can access input files (no special characters in paths)

5. **Upload limits**: 
   - Current limit: 500MB per file
   - Adjust in `server/index.js` multer configuration if needed

6. **Windows path issues**:
   - Use forward slashes in `FFMPEG_PATH`: `C:/ffmpeg/bin/ffmpeg.exe`
   - Or escape backslashes: `C:\\ffmpeg\\bin\\ffmpeg.exe`

### Debug Mode

For detailed FFmpeg output, check the server console logs. The application shows:
- FFmpeg detection status
- Directory creation status  
- Full FFmpeg commands being executed
- Processing progress and errors

### Performance Tips

- Use smaller video files for faster processing
- Adjust subtitle timing for better reading experience
- Monitor server logs for processing status

## Future Enhancements

- Real-time subtitle preview
- Database integration for storing projects
- Cloud storage for processed videos
- Batch processing capabilities
- Advanced subtitle formatting options
- Multi-language support
- Subtitle export formats (SRT, VTT, etc.)
- Custom FFmpeg filters and effects

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please open an issue in the repository or contact the development team.