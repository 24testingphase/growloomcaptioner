# Growloom Captioner

A modern, responsive full-stack web application for automatically generating and overlaying captions on videos using custom scripts. Built with React, Node.js, Express, and FFmpeg with a beautiful, intuitive interface.

## Features

- **Intuitive Script Input**: Write or paste your script directly in the application
- **Drag & Drop Video Upload**: Support for all major video formats (.mp4/.mov/.avi/.mkv/.webm/.flv/.wmv/.m4v/.3gp)
- **Real-time Processing**: Live progress indicators and status updates
- **Customizable Captions**: Adjust font size, color, position (top/center/bottom), and timing
- **Dynamic Duration Calculation**: Base duration + per-word timing (3s + 0.3s/word by default)
- **Preview Generation**: Automatic GIF preview of captioned content
- **Smart Video Extension**: Automatically extends video with black padding if subtitles are longer
- **Local Processing**: No cloud dependencies - runs entirely on your machine
- **Fully Responsive**: Beautiful interface that works perfectly on desktop, tablet, and mobile
- **Multi-Step Workflow**: Upload → Customize → Process → Results with visual progress tracking
- **One-Command Setup**: Single `npm run dev` starts both frontend and backend servers

## Prerequisites

Before running the application, ensure you have the following installed:

1. **Node.js** (v16 or higher)
2. **FFmpeg** - Required for video processing

### Installing FFmpeg

#### macOS (Recommended)
```bash
brew install ffmpeg
```

#### Windows
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract and add to your PATH environment variable
3. Or use Chocolatey: `choco install ffmpeg`
4. Or use Scoop: `scoop install ffmpeg`
#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

## Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd growloom-captioner
```

2. **Install all dependencies:**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

3. **Verify FFmpeg installation:**
```bash
ffmpeg -version
```

## Running the Application

### Quick Start (Recommended)
**Start both frontend and backend servers with one command:**
```bash
npm run dev
```

This will automatically start:
- Backend server on `http://localhost:3001`
- Frontend development server on `http://localhost:5173`

### Manual Start (Alternative)

If you prefer to start servers separately:

1. **Backend server** (in one terminal):
```bash
cd server
npm run dev
```

2. **Frontend server** (in another terminal):
```bash
npm run dev
```

## Production Deployment

1. **Build the application:**
```bash
npm run build
```

2. **Start production servers:**
```bash
# Start backend
cd server
npm start

# Serve frontend (in another terminal)
npm run preview
```

## API Endpoints

### POST /api/caption
Process a video with captions from a script.

**Request (multipart/form-data):**
- `script` (file): Generated from script content
- `video` (file): Video file (MP4/MOV)
- `baseDuration` (number): Base duration per subtitle (default: 3)
- `wordDuration` (number): Additional duration per word (default: 0.3)
- `fontColor` (string): Hex color code (default: #EC4899)
- `fontSize` (number): Font size in pixels (default: 24)
- `fontWeight` (string): Font weight (default: "bold")
- `position` (string): Caption position "top", "center", or "bottom" (default: "bottom")

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

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Default Caption Parameters

The application includes optimized defaults:

- **Base Duration**: 3 seconds per subtitle
- **Word Duration**: +0.3 seconds per word
- **Font Color**: Pink (#EC4899)
- **Font Size**: 24px
- **Font Weight**: Bold
- **Position**: Bottom of video (top/center/bottom available)
- **Split Mode**: One line per subtitle
- **Video Extension**: Automatic black padding if subtitles exceed video length

## Customization

### Adding New Features
- **Frontend**: Edit components in `src/components/` directory
- **Backend**: Modify `server/index.js` for processing logic
- **Styling**: Update `src/index.css` and Tailwind classes
- **Configuration**: Adjust defaults in `src/App.tsx`

### FFmpeg Customization
- Modify subtitle filters in `server/index.js`
- Adjust video processing parameters
- Add new output formats or quality settings

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
├── public/
├── server/
│   ├── index.js
│   ├── package.json
│   └── uploads/ (created automatically)
├── README.md
└── package.json
```

## Troubleshooting

### Common Issues

1. **FFmpeg not found**: Ensure FFmpeg is installed and in your PATH
   ```bash
   # Test FFmpeg installation
   ffmpeg -version
   ```

2. **Port conflicts**: 
   - Frontend (5173) or Backend (3001) ports in use
   - Change ports in `vite.config.ts` or `server/index.js`

3. **File upload issues**: 
   - Check file size limits (500MB default)
   - Ensure video format is supported
   - Verify CORS headers are working

4. **Processing failures**:
   - Check FFmpeg installation and PATH
   - Verify video file isn't corrupted
   - Check server logs for detailed errors

5. **Mobile responsiveness**:
   - Clear browser cache
   - Test on different devices
   - Check viewport meta tag

### Performance Tips

- **Optimize video files**: Use smaller files for faster processing
- **Adjust timing**: Fine-tune subtitle duration for readability
- **Monitor resources**: Check server logs during processing
- **Browser performance**: Close unnecessary tabs during processing

### Development Tips

- **Hot reload**: Both servers support automatic restart on file changes
- **Debugging**: Check browser console and server logs
- **Testing**: Use short videos for faster development cycles
- **Customization**: All styling uses Tailwind CSS classes

## Future Enhancements

- **Database Integration**: Store projects and user preferences
- **Cloud Storage**: AWS S3 or similar for video storage
- **Batch Processing**: Process multiple videos simultaneously
- **Advanced Formatting**: Rich text, animations, and effects
- **Multi-language**: Support for different languages and fonts
- **Export Formats**: SRT, VTT, ASS subtitle file exports
- **User Accounts**: Save projects and custom presets
- **API Integration**: Connect with video platforms

## License

MIT License - see LICENSE file for details

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository on GitHub
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
- Open an issue in the GitHub repository
- Check the troubleshooting section above
- Ensure FFmpeg is properly installed
- Test with different video formats and sizes

## Quick Commands Reference

```bash
# Start development (both servers)
npm run dev

# Build for production
npm run build

# Start backend only
cd server && npm run dev

# Start frontend only
npm run dev

# Check FFmpeg
ffmpeg -version

# Health check
curl http://localhost:3001/api/health
```