
import React, { useRef, useState } from 'react';
import './FileUpload.css';
import { parseFile, isSupportedFile, GPXData } from '../utils/parser';
import { useTranslation } from '../i18n';

interface FileUploadProps {
  onFileUpload: (data: GPXData, fileName: string) => void;
}

export function FileUpload({ onFileUpload }: FileUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (!isSupportedFile(file.name)) {
      setError(t('upload.errorInvalidFile'));
      return;
    }

    setIsLoading(true);
    try {
      const data = await parseFile(file);
      onFileUpload(data, file.name);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`${t('upload.errorParseFailed')}: ${errorMessage}`);
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
        <h2>{t('upload.heroTitle')}</h2>
        <p>{t('upload.heroDescription')}</p>
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
            <h3>{t('upload.processing')}</h3>
            <p>{t('upload.pleaseWait')}</p>
          </>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <h3>{t('upload.dropzone')}</h3>
            <p>{t('upload.dropzoneHint')}</p>
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
