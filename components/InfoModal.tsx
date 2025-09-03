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
                        className="modal-content !max-w-xl"
                    >
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="base-font font-bold text-2xl text-yellow-400">Hướng dẫn & Phím tắt</h3>
                             <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng hướng dẫn">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                        </div>
                        
                        <div className="space-y-6 text-neutral-300">
                            <div>
                                <h4 className="font-bold text-lg text-yellow-400/90 mb-2">Phím tắt</h4>
                                <ul className="space-y-2">
                                    <li className="flex justify-between items-center"><span>Quay lại (Undo)</span> <Shortcut keys="Cmd/Ctrl + Z" /></li>
                                    <li className="flex justify-between items-center"><span>Tiến lên (Redo)</span> <Shortcut keys="Cmd/Ctrl + Shift + Z" /></li>
                                    <li className="flex justify-between items-center"><span>Tìm kiếm ứng dụng</span> <Shortcut keys="Cmd/Ctrl + F" /></li>
                                    <li className="flex justify-between items-center"><span>Mở thư viện ảnh</span> <Shortcut keys="Cmd/Ctrl + G" /></li>
                                    <li className="flex justify-between items-center"><span>Mở bảng hướng dẫn này</span> <Shortcut keys="Cmd/Ctrl + H" /></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-yellow-400/90 mb-2">Hướng dẫn nhanh</h4>
                                 <ol className="list-decimal list-inside space-y-2 text-neutral-300">
                                    <li><strong>Chọn ứng dụng:</strong> Bắt đầu bằng cách chọn một trong các ứng dụng sáng tạo từ màn hình chính.</li>
                                    <li><strong>Tải ảnh lên:</strong> Nhấn vào khung ảnh để tải lên (các) ảnh cần thiết cho ứng dụng bạn đã chọn.</li>
                                    <li><strong>Tùy chỉnh:</strong> Sử dụng các tùy chọn có sẵn để tinh chỉnh kết quả theo ý muốn của bạn.</li>
                                    <li><strong>Tạo ảnh:</strong> Nhấn nút "Tạo ảnh" (hoặc tương tự) và chờ AI thực hiện phép màu!</li>
                                    <li><strong>Quản lý kết quả:</strong> Bạn có thể tải ảnh về, chỉnh sửa thêm, hoặc tạo lại với các yêu cầu khác. Các ảnh đã tạo sẽ được lưu tạm trong Thư viện ảnh (góc trên bên phải).</li>
                                </ol>
                            </div>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InfoModal;
