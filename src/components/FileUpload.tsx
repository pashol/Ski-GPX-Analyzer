
import React, { useRef, useState } from 'react';
import './FileUpload.css';
import { parseFile, isSupportedFile, GPXData } from '../utils/parser';
import { useTranslation } from '../i18n';
import { Capacitor } from '@capacitor/core';
import { pickNativeFile } from '../utils/filePicker';

interface FileUploadProps {
  onFileUpload: (data: GPXData, fileName: string) => void;
}

export function FileUpload({ onFileUpload }: FileUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNative = Capacitor.isNativePlatform();

  const handleFile = async (file: File | string, fileName?: string) => {
    setError(null);

    const name = fileName || (file as File).name;
    if (!isSupportedFile(name)) {
      setError(t('upload.errorInvalidFile'));
      return;
    }

    setIsLoading(true);
    try {
      // Handle both File objects (web) and base64 strings (native)
      let data: GPXData;
      if (typeof file === 'string') {
        // Decode base64 to string for parsing
        const decodedData = atob(file);
        // Create a Blob and File from the decoded data
        const blob = new Blob([decodedData], { type: 'text/plain' });
        const fileObj = new File([blob], name);
        data = await parseFile(fileObj);
      } else {
        data = await parseFile(file);
      }
      onFileUpload(data, name);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`${t('upload.errorParseFailed')}: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNativePick = async () => {
    try {
      const file = await pickNativeFile();
      if (!file) return; // User cancelled

      await handleFile(file.data, file.name);
    } catch (error: any) {
      setError(error.message);
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
    if (isNative) {
      handleNativePick();
    } else {
      fileInputRef.current?.click();
    }
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
        <h2>{t('upload.heroTitle')}</h2>
        <p>{t('upload.heroDescription')}</p>
      </div>

      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${isNative ? 'native' : ''}`}
        onDrop={!isNative ? handleDrop : undefined}
        onDragOver={!isNative ? handleDragOver : undefined}
        onDragLeave={!isNative ? handleDragLeave : undefined}
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
            <h3>{t('upload.processing')}</h3>
            <p>{t('upload.pleaseWait')}</p>
          </>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <h3>{isNative ? 'Tap to Select File' : t('upload.dropzone')}</h3>
            <p>{isNative ? 'Select a GPX or FIT file from your device' : t('upload.dropzoneHint')}</p>
            <span className="file-hint">{t('upload.fileHint')}</span>
          </>
        )}
      </div>

      {error && <div className="upload-error">{error}</div>}

      <div className="features-grid">
        <div className="feature-card">
          <span className="feature-icon">📊</span>
          <h4>{t('upload.featureStats')}</h4>
          <p>{t('upload.featureStatsDesc')}</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🗺️</span>
          <h4>{t('upload.featureMap')}</h4>
          <p>{t('upload.featureMapDesc')}</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">📈</span>
          <h4>{t('upload.featureProfile')}</h4>
          <p>{t('upload.featureProfileDesc')}</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🏔️</span>
          <h4>{t('upload.featureRuns')}</h4>
          <p>{t('upload.featureRunsDesc')}</p>
        </div>
      </div>
    </div>
  );
}
