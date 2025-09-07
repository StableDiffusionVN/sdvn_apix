/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls, combineImages } from './uiUtils';
import { cn } from '../lib/utils';

interface ImageLayoutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SelectedItem {
    url: string;
    label: string;
}

const ImageLayoutModal: React.FC<ImageLayoutModalProps> = ({ isOpen, onClose }) => {
    const { sessionGalleryImages, addImagesToGallery } = useAppControls();
    
    // State for selected items including their labels
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    
    // State for layout and label options
    const [layoutMode, setLayoutMode] = useState<'smart-grid' | 'horizontal' | 'vertical'>('smart-grid');
    const [gap, setGap] = useState(0);
    const [mainTitle, setMainTitle] = useState('');
    const [labelFontColor, setLabelFontColor] = useState('#000000');
    const [labelBgColor, setLabelBgColor] = useState('#FFFFFF');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleToggleSelect = (url: string) => {
        setSelectedItems(prev => 
            prev.some(item => item.url === url) 
                ? prev.filter(item => item.url !== url) 
                : [...prev, { url, label: '' }]
        );
    };

    const handleLabelChange = (index: number, newLabel: string) => {
        setSelectedItems(prev => {
            const newItems = [...prev];
            if (newItems[index]) {
                newItems[index].label = newLabel;
            }
            return newItems;
        });
    };

    const handleCombine = async () => {
        if (selectedItems.length < 1) return;
        setIsLoading(true);
        setError(null);
        try {
            const hasLabels = mainTitle.trim() !== '' || selectedItems.some(item => item.label.trim() !== '');

            const resultUrl = await combineImages(selectedItems, {
                layout: layoutMode,
                mainTitle: mainTitle.trim(),
                gap: gap,
                labels: {
                    enabled: hasLabels,
                    fontColor: labelFontColor,
                    backgroundColor: labelBgColor,
                }
            });
            addImagesToGallery([resultUrl]);
            setSelectedItems([]);
            setMainTitle('');
        } catch (err) {
            console.error("Failed to combine images:", err);
            const errorMessage = err instanceof Error ? err.message : "Lỗi không xác định.";
            setError(`Lỗi: Không thể ghép ảnh. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClose = () => {
        if (isLoading) return;
        onClose();
        setSelectedItems([]);
        setMainTitle('');
        setError(null);
    };

    const layoutButtonClasses = "btn btn-secondary btn-sm !text-xs !py-1 !px-3 flex-1 rounded-md";

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="modal-overlay z-[60]"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content !max-w-6xl !h-[90vh] flex flex-row !p-0"
                    >
                        {/* Sidebar */}
                        <aside className="w-1/3 max-w-sm flex flex-col bg-neutral-900/50 p-6 border-r border-white/10">
                            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                                <h3 className="base-font font-bold text-2xl text-yellow-400">Tùy chọn Bố cục</h3>
                                <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto space-y-6 pr-2 -mr-4">
                                <div>
                                    <label className="block text-base font-medium text-neutral-300 mb-2">Chế độ</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => setLayoutMode('smart-grid')} className={cn(layoutButtonClasses, layoutMode === 'smart-grid' && '!bg-yellow-400 !text-black')}>Lưới</button>
                                        <button onClick={() => setLayoutMode('horizontal')} className={cn(layoutButtonClasses, layoutMode === 'horizontal' && '!bg-yellow-400 !text-black')}>Ngang</button>
                                        <button onClick={() => setLayoutMode('vertical')} className={cn(layoutButtonClasses, layoutMode === 'vertical' && '!bg-yellow-400 !text-black')}>Dọc</button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label htmlFor="layout-gap" className="block text-base font-medium text-neutral-300 mb-2">
                                        Khoảng cách / Viền ({gap}px)
                                    </label>
                                    <input
                                        id="layout-gap"
                                        type="range"
                                        min="0"
                                        max="50"
                                        step="1"
                                        value={gap}
                                        onChange={(e) => setGap(Number(e.target.value))}
                                        className="slider-track"
                                    />
                                </div>

                                <div className="border-t border-white/10 pt-6 space-y-4">
                                    <h4 className="text-base font-medium text-neutral-200">Thêm nhãn (Tùy chọn)</h4>
                                    <div>
                                        <label htmlFor="main-title" className="block text-sm font-medium text-neutral-300 mb-2">Tiêu đề chính</label>
                                        <input type="text" id="main-title" value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} className="form-input" placeholder="Tiêu đề cho toàn bộ ảnh..."/>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                         <div>
                                            <label htmlFor="label-fontcolor" className="block text-sm font-medium text-neutral-300 mb-2">Màu chữ</label>
                                            <input type="color" id="label-fontcolor" value={labelFontColor} onChange={(e) => setLabelFontColor(e.target.value)} className="w-full h-10 p-1 border border-neutral-700 rounded-md cursor-pointer"/>
                                        </div>
                                         <div>
                                            <label htmlFor="label-bgcolor" className="block text-sm font-medium text-neutral-300 mb-2">Màu nền nhãn</label>
                                            <input type="color" id="label-bgcolor" value={labelBgColor} onChange={(e) => setLabelBgColor(e.target.value)} className="w-full h-10 p-1 border border-neutral-700 rounded-md cursor-pointer"/>
                                        </div>
                                    </div>
                                    <p className="text-xs text-neutral-500">Nhập nhãn cho từng ảnh đã chọn dưới đây. Nhãn trống sẽ được bỏ qua.</p>
                                    <ul className="space-y-3 pt-3 border-t border-white/10 max-h-60 overflow-y-auto">
                                        {selectedItems.map((item, index) => (
                                            <li key={item.url} className="flex items-center gap-3">
                                                <img src={item.url} className="w-12 h-12 object-cover rounded-md flex-shrink-0" alt={`Selected thumbnail ${index + 1}`}/>
                                                <input type="text" placeholder={`Nhãn ${index + 1}`} value={item.label} onChange={(e) => handleLabelChange(index, e.target.value)} className="form-input" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="flex-shrink-0 pt-6 border-t border-white/10">
                                {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
                                <button onClick={handleCombine} className="btn btn-primary w-full rounded-md" disabled={selectedItems.length < 1 || isLoading}>
                                 {isLoading ? 'Đang xử lý...' : `Ghép (${selectedItems.length}) ảnh`}
                               </button>
                            </div>
                        </aside>

                        {/* Main Content */}
                        <main className="flex-1 flex flex-col p-6">
                             <h3 className="base-font font-bold text-xl text-neutral-300 mb-4 flex-shrink-0">Chọn ảnh từ thư viện (Thứ tự chọn = thứ tự ghép)</h3>
                             {sessionGalleryImages.length > 0 ? (
                                <div className="gallery-grid">
                                    {sessionGalleryImages.map((img, index) => {
                                        const selectedIndex = selectedItems.findIndex(item => item.url === img);
                                        const isSelected = selectedIndex !== -1;
                                        return (
                                            <motion.div 
                                                key={`${img.slice(-20)}-${index}`} 
                                                className="gallery-grid-item group relative"
                                                onClick={() => handleToggleSelect(img)}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.03 }}
                                            >
                                                <img src={img} alt={`Gallery image ${index + 1}`} loading="lazy" />
                                                <div className={cn(
                                                    "absolute inset-0 transition-all duration-200 pointer-events-none",
                                                    isSelected ? 'bg-yellow-400/50 ring-4 ring-yellow-400' : 'bg-black/60 opacity-0 group-hover:opacity-100'
                                                )}>
                                                   {isSelected && (
                                                       <div className="absolute top-2 left-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-black font-bold text-sm border-2 border-white/50">
                                                           {selectedIndex + 1}
                                                       </div>
                                                   )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-neutral-400 flex-1 flex items-center justify-center">
                                    <p>Thư viện của bạn đang trống. Hãy tạo một vài ảnh để bắt đầu ghép!</p>
                                </div>
                            )}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ImageLayoutModal;