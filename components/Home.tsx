/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface AppConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface HomeProps {
  onSelectApp: (appId: string) => void;
  title: React.ReactNode;
  subtitle: string;
  apps: AppConfig[];
}

const Home: React.FC<HomeProps> = ({ onSelectApp, title, subtitle, apps }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const APPS_PER_PAGE = 4;
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
      ? 'flex flex-wrap justify-start gap-6 w-full max-w-4xl'
      : 'flex justify-center w-full max-w-xl';

  const renderAppTitle = (title: string) => {
    // Replace newline characters with a space for single-line display on home cards
    return title.replace(/\n/g, ' ');
  };

  return (
    <motion.div 
      key="home-wrapper"
      className="w-full max-w-4xl mx-auto text-center flex flex-col items-center justify-center h-full"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
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
              <span className="base-font font-bold text-white mt-6 self-end transition-transform duration-300 group-hover:translate-x-1">Bắt đầu →</span>
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
                  ‹ Trước
                </button>
                <span aria-live="polite">Trang {currentPage} / {totalPages}</span>
                <button onClick={handleNextPage} disabled={currentPage === totalPages} aria-label="Trang sau">
                  Sau ›
                </button>
              </>
            )}
            <button onClick={handleToggleShowAll}>
              {showAll ? 'Thu gọn' : 'Hiển thị tất cả'}
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default Home;