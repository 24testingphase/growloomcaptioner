import React, { useState, useCallback } from 'react';
import { DivideIcon as LucideIcon, CheckCircle, X } from 'lucide-react';

interface DragDropZoneProps {
  onFileUpload: (files: FileList) => void;
  acceptedTypes: string;
  icon: LucideIcon;
  title: string;
  description: string;
  file: File | null;
  onFileDeselect?: () => void;
}

const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFileUpload,
  acceptedTypes,
  icon: Icon,
  title,
  description,
  file,
  onFileDeselect
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileUpload(files);
    }
  }, [onFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files);
    }
  }, [onFileUpload]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-6 lg:p-8 text-center transition-all duration-500 transform hover:scale-105 ${
        isDragging
          ? 'border-purple-400 bg-purple-500/20 scale-105 shadow-2xl shadow-purple-500/25'
          : file
          ? 'border-green-400 bg-green-500/20 shadow-2xl shadow-green-500/25'
          : 'border-white/30 bg-white/5 hover:border-purple-400 hover:bg-purple-500/10 hover:shadow-xl hover:shadow-purple-500/20'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {file && onFileDeselect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFileDeselect();
          }}
          className="absolute top-2 right-2 z-10 p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-full transition-all duration-300 hover:scale-110"
          title="Remove file"
        >
          <X className="w-4 h-4 text-red-300" />
        </button>
      )}
      
      <input
        type="file"
        accept={acceptedTypes}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex flex-col items-center space-y-3 sm:space-y-4">
        <div className={`relative transition-all duration-500 ${
          file ? 'scale-110' : isDragging ? 'scale-125 animate-pulse' : 'hover:scale-110'
        }`}>
          <div className={`p-3 sm:p-4 rounded-2xl transition-all duration-500 ${
            file 
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg' 
              : isDragging
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg animate-pulse'
              : 'bg-gradient-to-r from-purple-500/50 to-pink-500/50'
          }`}>
            <Icon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
          </div>
          {file && (
            <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 shadow-lg animate-bounce">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
            </div>
          )}
        </div>
        
        <div className="space-y-1 sm:space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-white">{title}</h3>
          {file ? (
            <div className="space-y-1 sm:space-y-2">
              <p className="font-semibold text-green-300 truncate max-w-32 sm:max-w-48 text-sm sm:text-base">{file.name}</p>
              <p className="text-sm text-green-200">{formatFileSize(file.size)}</p>
              <div className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full bg-green-500/20 border border-green-300/30">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-300 mr-1 sm:mr-2" />
                <span className="text-sm text-green-300 font-medium">File uploaded</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1 sm:space-y-2">
              <p className="text-purple-200 text-sm sm:text-base">{description}</p>
              <div className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border transition-all duration-300 ${
                isDragging 
                  ? 'border-purple-300 bg-purple-500/20 text-purple-200' 
                  : 'border-white/30 bg-white/10 text-white/80 hover:border-purple-300 hover:bg-purple-500/20'
              }`}>
                <span className="text-sm font-medium">
                  {isDragging ? 'Drop your file here' : 'Drag & drop or click to browse'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DragDropZone;