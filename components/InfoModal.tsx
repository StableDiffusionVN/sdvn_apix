/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const Shortcut: React.FC<{ keys: string }> = ({ keys }) => (
    <div className="flex items-center gap-1">
        {keys.split('+').map(key => (
            <kbd key={key} className="px-2 py-1 text-xs font-semibold text-neutral-300 bg-neutral-900 border border-neutral-700 rounded-md">
                {key.trim()}
            </kbd>
        ))}
    </div>
);


const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content !max-w-4xl"
                    >
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="base-font font-bold text-2xl text-yellow-400">Hướng dẫn & Phím tắt</h3>
                             <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng hướng dẫn">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 text-neutral-300 max-h-[65vh] overflow-y-auto pr-4 -mr-4">
                            {/* Column 1 */}
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold text-lg text-yellow-400/90 mb-2 border-b border-yellow-400/20 pb-1">Phím tắt chung</h4>
                                    <p className="text-sm text-neutral-400 mb-3">Hoạt động ở mọi nơi trong ứng dụng.</p>
                                    <ul className="space-y-2">
                                        <li className="flex justify-between items-center"><span>Về trang chủ</span> <Shortcut keys="Cmd/Ctrl + H" /></li>
                                        <li className="flex justify-between items-center"><span>Tìm kiếm ứng dụng</span> <Shortcut keys="Cmd/Ctrl + F" /></li>
                                        <li className="flex justify-between items-center"><span>Mở thư viện ảnh</span> <Shortcut keys="Cmd/Ctrl + G" /></li>
                                        <li className="flex justify-between items-center"><span>Mở Trình chỉnh sửa ảnh</span> <Shortcut keys="Cmd/Ctrl + E" /></li>
                                        <li className="flex justify-between items-center"><span>Mở bảng hướng dẫn này</span> <Shortcut keys="Cmd/Ctrl + /" /></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-yellow-400/90 mb-2 border-b border-yellow-400/20 pb-1">Điều hướng Ứng dụng</h4>
                                    <p className="text-sm text-neutral-400 mb-3">Chỉ hoạt động khi Trình chỉnh sửa ảnh đang đóng.</p>
                                    <ul className="space-y-2">
                                        <li className="flex justify-between items-center"><span>Quay lại (Undo)</span> <Shortcut keys="Cmd/Ctrl + Z" /></li>
                                        <li className="flex justify-between items-center"><span>Tiến lên (Redo)</span> <Shortcut keys="Cmd/Ctrl + Shift + Z" /></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-yellow-400/90 mb-2 border-b border-yellow-400/20 pb-1">Trình chỉnh sửa ảnh: Hoàn tác</h4>
                                    <p className="text-sm text-neutral-400 mb-3">Chỉ hoạt động khi Trình chỉnh sửa ảnh đang mở.</p>
                                    <ul className="space-y-2">
                                        <li className="flex justify-between items-center"><span>Hoàn tác (Undo)</span> <Shortcut keys="Cmd/Ctrl + Z" /></li>
                                        <li className="flex justify-between items-center"><span>Làm lại (Redo)</span> <Shortcut keys="Cmd/Ctrl + Shift + Z" /></li>
                                    </ul>
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-bold text-lg text-yellow-400/90 mb-2 border-b border-yellow-400/20 pb-1">Trình chỉnh sửa ảnh: Công cụ</h4>
                                    <ul className="space-y-2">
                                        <li className="flex justify-between items-center"><span>Cắt ảnh (Crop)</span> <Shortcut keys="C" /></li>
                                        <li className="flex justify-between items-center"><span>Chọn vùng (Lasso)</span> <Shortcut keys="L" /></li>
                                        <li className="flex justify-between items-center"><span>Chọn vùng Chữ nhật (Marquee)</span> <Shortcut keys="M" /></li>
                                        <li className="flex justify-between items-center"><span>Chọn vùng Elip (Ellipse)</span> <Shortcut keys="Shift + M" /></li>
                                        <li className="flex justify-between items-center"><span>Công cụ Bút (Pen)</span> <Shortcut keys="P" /></li>
                                        <li className="flex justify-between items-center"><span>Cọ vẽ (Brush)</span> <Shortcut keys="B" /></li>
                                        <li className="flex justify-between items-center"><span>Tẩy (Eraser)</span> <Shortcut keys="E" /></li>
                                        <li className="flex justify-between items-center"><span>Chấm màu (Color Picker)</span> <Shortcut keys="I" /></li>
                                        <li className="flex justify-between items-center"><span>Tăng/Giảm kích thước cọ</span> <Shortcut keys="] / [" /></li>
                                        <li className="flex justify-between items-center"><span>Chấm màu tạm thời</span> <Shortcut keys="Giữ Alt" /></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-yellow-400/90 mb-2 border-b border-yellow-400/20 pb-1">Trình chỉnh sửa ảnh: Vùng chọn & Bút</h4>
                                    <ul className="space-y-2">
                                        <li className="flex justify-between items-center"><span>Thêm vào vùng chọn</span> <Shortcut keys="Giữ Shift + Vẽ" /></li>
                                        <li className="flex justify-between items-center"><span>Trừ khỏi vùng chọn</span> <Shortcut keys="Giữ Alt + Vẽ" /></li>
                                        <li className="flex justify-between items-center"><span>Xóa nội dung trong vùng chọn</span> <Shortcut keys="Delete / Backspace" /></li>
                                        <li className="flex justify-between items-center"><span>Tô màu vào vùng chọn</span> <Shortcut keys="Cmd/Ctrl + Delete" /></li>
                                        <li className="flex justify-between items-center"><span>Bỏ chọn</span> <Shortcut keys="Cmd/Ctrl + D" /></li>
                                        <li className="flex justify-between items-center"><span>Nghịch đảo vùng chọn</span> <Shortcut keys="Cmd/Ctrl + Shift + I" /></li>
                                        <li className="flex justify-between items-center"><span>Hủy đường Bút (Pen)</span> <Shortcut keys="Esc" /></li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InfoModal;