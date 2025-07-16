# Growloom Captioner

A modern, full-stack web application for automatically generating and overlaying captions on videos using custom scripts. Built with React, Node.js, Express, and FFmpeg.

## Features

- **Drag & Drop Interface**: Upload script (.txt) and video files (.mp4/.mov) with ease
- **Real-time Processing**: Live progress indicators and status updates
- **Customizable Captions**: Adjust font size, color, position, and timing
- **Dynamic Duration Calculation**: Base duration + per-word timing (3s + 0.3s/word by default)
- **Preview Generation**: Automatic GIF preview of captioned content
- **Local Processing**: No cloud dependencies - runs entirely on your machine
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Multiple Video Formats**: Supports MP4, MOV, AVI, MKV, WEBM, FLV, WMV, M4V, 3GP (case-insensitive)
- **Multi-Step Interface**: Intuitive workflow with upload, customize, processing, and results steps

## Prerequisites

Before running the application, you need:

1. **Node.js** (v16 or higher)
2. **FFmpeg** - Required for video processing (automatically detected)

### Installing FFmpeg

The application will automatically detect FFmpeg if it's installed in your system PATH. If you need to install it:

#### macOS
```bash
brew install ffmpeg
```

#### Windows
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract and add to your PATH environment variable

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

#### Custom FFmpeg Path
If FFmpeg is installed in a custom location, set the environment variable:
```bash
export FFMPEG_PATH="/path/to/your/ffmpeg"
```

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

## Configuration

### FFmpeg Setup
The application automatically detects FFmpeg installation. On startup, you'll see:
- ✅ `FFmpeg found at: /usr/local/bin/ffmpeg` (success)
- ⚠️  `FFmpeg not found in system PATH` (needs installation)

### Environment Variables
- `FFMPEG_PATH`: Custom path to FFmpeg executable
- `PORT`: Backend server port (default: 3001)

Example `.env` file:
```
FFMPEG_PATH=/usr/local/bin/ffmpeg
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
   - Install FFmpeg using the commands above
   - Or set `FFMPEG_PATH` environment variable
   - Restart the server after installation

2. **Port conflicts**: Change the port in `server/index.js` if 3001 is in use

3. **File upload limits**: Adjust `fileSize` limit in multer configuration

4. **CORS issues**: Backend includes CORS headers, ensure both servers are running

5. **Video format issues**: 
   - All major formats are supported (case-insensitive)
   - If subtitles are longer than video, black padding is automatically added

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