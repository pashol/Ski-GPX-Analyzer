
import React, { useRef, useState } from 'react';
import './FileUpload.css';
import { parseFile, isSupportedFile, GPXData } from '../utils/parser';

interface FileUploadProps {
  onFileUpload: (data: GPXData, fileName: string) => void;
}

export function FileUpload({ onFileUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (!isSupportedFile(file.name)) {
      setError('Please upload a valid GPX or FIT file');
      return;
    }

    setIsLoading(true);
    try {
      const data = await parseFile(file);
      onFileUpload(data, file.name);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to parse file: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-hero">
        <div className="hero-icon">🎿</div>
        <h2>Analyze Your Ski Adventure</h2>
        <p>Upload your GPX or FIT file to get comprehensive statistics, interactive maps, and detailed analysis of your ski runs.</p>
      </div>

      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx,.fit"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        {isLoading ? (
          <>
            <div className="upload-icon loading">⏳</div>
            <h3>Processing file...</h3>
            <p>Please wait</p>
          </>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <h3>Drop your GPX or FIT file here</h3>
            <p>or click to browse</p>
            <span className="file-hint">Supports .gpx and .fit files from Strava, Garmin, and other GPS devices</span>
          </>
        )}
      </div>

      {error && <div className="upload-error">{error}</div>}

      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon">📊</span>
          <h4>Detailed Statistics</h4>
          <p>Speed, distance, elevation, and more</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🗺️</span>
          <h4>Interactive Map</h4>
          <p>Visualize your track in satellite view</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">📈</span>
          <h4>Elevation Profile</h4>
          <p>See altitude changes over time</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🏔️</span>
          <h4>Run Detection</h4>
          <p>Automatic identification of ski runs</p>
        </div>
      </div>
    </div>
  );
}
