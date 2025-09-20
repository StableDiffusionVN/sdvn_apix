/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// FIX: Update AppConfig import to be a type import and define a more specific type for the processed app data.
import { useAppControls, extractJsonFromPng, type AppConfig } from './uiUtils';
import { CloudUploadIcon } from './icons';

interface ProcessedAppConfig extends AppConfig {
  title: string;
  description: string;
}

interface HomeProps {
  onSelectApp: (appId: string) => void;
  title: React.ReactNode;
  subtitle: string;
  apps: ProcessedAppConfig[];
}

const Home: React.FC<HomeProps> = ({ onSelectApp, title, subtitle, apps }) => {
  const { t, importSettingsAndNavigate } = useAppControls();
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const APPS_PER_PAGE = 8;
  const totalPages = Math.ceil(apps.length / APPS_PER_PAGE);

  const displayedApps = showAll 
    ? apps 
    : apps.slice((currentPage - 1) * APPS_PER_PAGE, currentPage * APPS_PER_PAGE);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleToggleShowAll = () => {
    setShowAll(prev => !prev);
    if (showAll) { // If it's currently showing all, we are collapsing it
      setCurrentPage(1);
    }
  };


  // Handle layout for app cards: center single card, left-align multiple cards.
  const appListContainerClasses =
    displayedApps.length > 1
      ? 'grid w-full max-w-screen-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'
      : 'flex w-full max-w-xl justify-center';

  const renderAppTitle = (title: string) => {
    // Replace newline characters with a space for single-line display on home cards
    return title.replace(/\n/g, ' ');
  };
  
  const handleFile = async (file: File) => {
    let settings = null;
    if (file.type === 'image/png') {
        settings = await extractJsonFromPng(file);
    } else if (file.type === 'application/json') {
        try {
            settings = JSON.parse(await file.text());
        } catch (e) {
            console.error("Failed to parse JSON file", e);
            alert("Invalid JSON file.");
        }
    }

    if (settings) {
        importSettingsAndNavigate(settings);
    } else {
        alert("Could not find any settings in the provided file.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          await handleFile(e.dataTransfer.files[0]);
      }
  };

  return (
    <motion.div 
      key="home-wrapper"
      className="w-full max-w-screen-2xl mx-auto text-center flex flex-col items-center justify-center h-full relative"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-center mb-12">
          <h1 className="text-6xl/[1.3] md:text-8xl/[1.3] title-font font-bold text-white [text-shadow:1px_1px_3px_rgba(0,0,0,0.4)] tracking-wider">{title}</h1>
          <p className="sub-title-font font-bold text-neutral-200 mt-2 text-xl tracking-wide">{subtitle}</p>
      </div>


      <div className={appListContainerClasses}>
        {displayedApps.map((app, index) => {
          return (
            <motion.div
              key={app.id}
              className="app-card group"
              onClick={() => onSelectApp(app.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              role="button"
              tabIndex={0}
              aria-label={`Mở tính năng ${app.title.replace('\n', ' ')}`}
            >
              <div className="text-5xl mb-4 transition-transform duration-300 group-hover:scale-110">{app.icon}</div>
              <h3 className="base-font font-bold text-xl text-yellow-400 mb-2 min-h-[3.5rem] flex items-center">
                {renderAppTitle(app.title)}
              </h3>
              <p className="base-font text-neutral-300 flex-grow text-sm">{app.description}</p>
              <span className="base-font font-bold text-white mt-6 self-end transition-transform duration-300 group-hover:translate-x-1">{t('home_start')}</span>
            </motion.div>
          );
        })}
      </div>

      {apps.length > APPS_PER_PAGE && (
        <div className="mt-8 w-full flex justify-center">
          <motion.div 
            className="pagination-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {!showAll && totalPages > 1 && (
              <>
                <button onClick={handlePrevPage} disabled={currentPage === 1} aria-label="Trang trước">
                  {t('home_prevPage')}
                </button>
                <span aria-live="polite">{t('home_page')} {currentPage} / {totalPages}</span>
                <button onClick={handleNextPage} disabled={currentPage === totalPages} aria-label="Trang sau">
                  {t('home_nextPage')}
                </button>
              </>
            )}
            <button onClick={handleToggleShowAll}>
              {showAll ? t('home_collapse') : t('home_showAll')}
            </button>
          </motion.div>
        </div>
      )}
      <AnimatePresence>
          {isDraggingOver && (
              <motion.div
                  className="absolute inset-0 bg-black/70 border-4 border-dashed border-yellow-400 rounded-2xl flex flex-col items-center justify-center pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <CloudUploadIcon className="h-16 w-16 text-yellow-400 mb-4" strokeWidth={1}/>
                  <p className="text-2xl font-bold text-yellow-400">Thả file JSON hoặc ảnh PNG để import cài đặt</p>
              </motion.div>
          )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Home;
